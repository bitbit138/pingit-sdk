package com.pingit.core

import com.pingit.core.model.ProfileTable
import com.pingit.core.profiles.CacheState
import com.pingit.core.profiles.ProfileCache
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class ProfileCacheTest {

    private fun table(version: Int) = ProfileTable(version, emptyList())

    @Test
    fun isStaleWhenPastRefreshTime() {
        val state = CacheState(table(1), fetchedAtMillis = 0L, nextRefreshAtMillis = 1000L)
        assertFalse(ProfileCache.isStale(state, now = 999L))
        assertTrue(ProfileCache.isStale(state, now = 1000L))
        assertTrue(ProfileCache.isStale(state, now = 2000L))
    }

    @Test
    fun computeNextRefreshIsDeterministicForSeededRng() {
        val now = 1_000_000L
        // nextDouble = 0.5 -> jitter = 0 -> exactly +24h
        val mid = ProfileCache.computeNextRefresh(now, FakeRng(0.5))
        assertEquals(now + 24L * 60 * 60 * 1000, mid)

        // Same seed sequence produces identical results across calls.
        val a = ProfileCache.computeNextRefresh(now, FakeRng(0.25))
        val b = ProfileCache.computeNextRefresh(now, FakeRng(0.25))
        assertEquals(a, b)

        // Lower draw -> earlier than the base; higher -> later.
        val low = ProfileCache.computeNextRefresh(now, FakeRng(0.0))
        val high = ProfileCache.computeNextRefresh(now, FakeRng(0.999999))
        assertTrue(low < mid)
        assertTrue(high > mid)
    }

    @Test
    fun shouldReplaceWhenNoCurrentOrVersionDiffers() {
        assertTrue(ProfileCache.shouldReplace(current = null, fetched = table(1)))
        assertTrue(ProfileCache.shouldReplace(current = table(1), fetched = table(2)))
        assertFalse(ProfileCache.shouldReplace(current = table(3), fetched = table(3)))
    }
}
