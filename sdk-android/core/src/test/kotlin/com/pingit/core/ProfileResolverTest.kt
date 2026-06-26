package com.pingit.core

import com.pingit.core.fallback.Target
import com.pingit.core.model.ProfileSpec
import com.pingit.core.model.ProfileTable
import com.pingit.core.model.Profile
import com.pingit.core.model.Requires
import com.pingit.core.profiles.CacheState
import com.pingit.core.profiles.ProfileResolver
import kotlinx.coroutines.test.runTest
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class ProfileResolverTest {

    private fun table(version: Int, vararg ids: Profile) = ProfileTable(
        version = version,
        profiles = ids.map { ProfileSpec(it, Requires()) },
    )

    private fun resolver(
        http: FakeHttpClient,
        store: FakeProfileStore,
        clock: FakeClock = FakeClock(millis = 1_000_000L),
        rng: FakeRng = FakeRng(0.5),
    ) = ProfileResolver(http, store, clock, rng, Target.PRIMARY) to store

    @Test
    fun firstRunWithServerUpFetchesAndPersists() = runTest {
        val server = table(7, Profile.VIDEO_CALL)
        val http = FakeHttpClient(profiles = server)
        val store = FakeProfileStore(state = null)
        val (r, s) = resolver(http, store)

        val result = r.resolve(force = false)
        assertEquals(7, result.version)
        assertEquals(1, http.fetchProfilesCalls)
        assertEquals(1, s.writes.size)
        assertEquals(7, s.writes.first().table.version)
    }

    @Test
    fun versionUnchangedKeepsCachedTableButRefreshes() = runTest {
        val cachedTable = table(5, Profile.VOICE_CALL, Profile.VIDEO_CALL)
        val clock = FakeClock(millis = 50L)
        val store = FakeProfileStore(
            state = CacheState(cachedTable, fetchedAtMillis = 0L, nextRefreshAtMillis = 10L), // stale
        )
        // Server returns same version 5 (with fewer profiles to prove we keep cached).
        val http = FakeHttpClient(profiles = table(5, Profile.VOICE_CALL))
        val (r, s) = resolver(http, store, clock)

        val result = r.resolve(force = false)
        assertEquals(5, result.version)
        // Kept the cached table (2 profiles), not the server one (1 profile).
        assertEquals(2, result.profiles.size)
        // Refresh time was bumped.
        assertTrue(s.writes.isNotEmpty())
        assertTrue(s.writes.last().nextRefreshAtMillis > 50L)
    }

    @Test
    fun staleCacheRefetchesNewVersion() = runTest {
        val clock = FakeClock(millis = 100L)
        val store = FakeProfileStore(
            state = CacheState(table(1, Profile.MESSAGING), fetchedAtMillis = 0L, nextRefreshAtMillis = 50L),
        )
        val http = FakeHttpClient(profiles = table(2, Profile.MESSAGING, Profile.VIDEO_CALL))
        val (r, _) = resolver(http, store, clock)

        val result = r.resolve(force = false)
        assertEquals(2, result.version)
        assertEquals(1, http.fetchProfilesCalls)
    }

    @Test
    fun freshCacheNotRefetched() = runTest {
        val clock = FakeClock(millis = 10L)
        val store = FakeProfileStore(
            state = CacheState(table(3, Profile.MESSAGING), fetchedAtMillis = 0L, nextRefreshAtMillis = 1_000L),
        )
        val http = FakeHttpClient(profiles = table(9, Profile.VIDEO_CALL))
        val (r, _) = resolver(http, store, clock)

        val result = r.resolve(force = false)
        assertEquals(3, result.version)
        assertEquals(0, http.fetchProfilesCalls) // not fetched, cache fresh
    }

    @Test
    fun serverDownWithCacheUsesCache() = runTest {
        val clock = FakeClock(millis = 100L)
        val store = FakeProfileStore(
            state = CacheState(table(4, Profile.HD_STREAMING), fetchedAtMillis = 0L, nextRefreshAtMillis = 50L),
        )
        val http = FakeHttpClient(profilesError = true)
        val (r, _) = resolver(http, store, clock)

        val result = r.resolve(force = false)
        assertEquals(4, result.version)
    }

    @Test
    fun serverDownNoCacheFallsBackToBundled() = runTest {
        val http = FakeHttpClient(profilesError = true)
        val store = FakeProfileStore(state = null)
        val (r, _) = resolver(http, store)

        val result = r.resolve(force = false)
        // Bundled profiles.json has version 1 and 10 profiles.
        assertEquals(1, result.version)
        assertEquals(10, result.profiles.size)
    }

    @Test
    fun forceRefetchesEvenWhenFresh() = runTest {
        val clock = FakeClock(millis = 10L)
        val store = FakeProfileStore(
            state = CacheState(table(3, Profile.MESSAGING), fetchedAtMillis = 0L, nextRefreshAtMillis = 1_000L),
        )
        val http = FakeHttpClient(profiles = table(8, Profile.VIDEO_CALL))
        val (r, _) = resolver(http, store, clock)

        val result = r.resolve(force = true)
        assertEquals(8, result.version)
        assertEquals(1, http.fetchProfilesCalls)
    }
}
