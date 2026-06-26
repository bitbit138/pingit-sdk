package com.pingit.core

import com.pingit.core.eval.ReadinessService
import com.pingit.core.fallback.Target
import com.pingit.core.measure.MeasurementService
import com.pingit.core.model.Config
import com.pingit.core.model.HistoryMode
import com.pingit.core.model.Profile
import com.pingit.core.model.ProfileSpec
import com.pingit.core.model.ProfileTable
import com.pingit.core.model.Range
import com.pingit.core.model.Requires
import com.pingit.core.profiles.CacheState
import com.pingit.core.profiles.ProfileResolver
import kotlinx.coroutines.test.runTest
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class PingItCoreTest {

    private val table = ProfileTable(
        version = 1,
        profiles = listOf(
            ProfileSpec(
                Profile.VIDEO_CALL,
                Requires(downloadMbps = Range(min = 1.5), uploadMbps = Range(min = 1.0), latencyMs = Range(max = 200.0)),
            ),
        ),
    )

    private fun build(
        config: Config,
        http: FakeHttpClient = FakeHttpClient(downloadMbps = 50.0, uploadMbps = 20.0, pingMs = 20.0, profiles = table),
        connectivity: FakeConnectivity = FakeConnectivity(connected = true),
        lastStore: FakeLastResultStore = FakeLastResultStore(),
        outbox: FakeOutbox = FakeOutbox(),
        profileStore: FakeProfileStore = FakeProfileStore(
            state = CacheState(table, fetchedAtMillis = 0L, nextRefreshAtMillis = Long.MAX_VALUE),
        ),
    ): PingItCore {
        val clock = FakeClock(millis = 123L)
        val measurement = MeasurementService(http, clock, config.dataSaver) { Target.PRIMARY }
        val readiness = ReadinessService(connectivity, measurement)
        val resolver = ProfileResolver(http, profileStore, clock, FakeRng(0.5), Target.PRIMARY)
        return PingItCore(
            appId = "app-1",
            deviceIdProvider = FakeDeviceIdProvider(),
            config = config,
            http = http,
            connectivity = connectivity,
            clock = clock,
            lastResultStore = lastStore,
            outbox = outbox,
            profileResolver = resolver,
            measurement = measurement,
            readiness = readiness,
        )
    }

    @Test
    fun runTestPersistsLocallyInLastLocalMode() = runTest {
        val lastStore = FakeLastResultStore()
        val outbox = FakeOutbox()
        val core = build(
            Config(historyMode = HistoryMode.LAST_LOCAL, endpoint = "https://e"),
            lastStore = lastStore, outbox = outbox,
        )
        val result = core.runTest()
        assertEquals(1, lastStore.writes.size)
        assertEquals(result, lastStore.current)
        assertTrue(outbox.items.isEmpty()) // not enqueued in LAST_LOCAL
    }

    @Test
    fun runTestEnqueuesInServerHistoryMode() = runTest {
        val lastStore = FakeLastResultStore()
        val outbox = FakeOutbox()
        val core = build(
            Config(historyMode = HistoryMode.SERVER_HISTORY, endpoint = "https://e"),
            lastStore = lastStore, outbox = outbox,
        )
        core.runTest()
        assertEquals(1, lastStore.writes.size)
        assertEquals(1, outbox.items.size)
    }

    @Test
    fun runTestDoesNotPersistInNoneMode() = runTest {
        val lastStore = FakeLastResultStore()
        val outbox = FakeOutbox()
        val core = build(
            Config(historyMode = HistoryMode.NONE, endpoint = "https://e"),
            lastStore = lastStore, outbox = outbox,
        )
        core.runTest()
        assertTrue(lastStore.writes.isEmpty())
        assertTrue(outbox.items.isEmpty())
    }

    @Test
    fun isReadyForPassesForGoodLink() = runTest {
        val core = build(Config(historyMode = HistoryMode.LAST_LOCAL, endpoint = "https://e"))
        val r = core.isReadyFor(Profile.VIDEO_CALL)
        assertTrue(r.passed, r.reason)
        assertEquals(Profile.VIDEO_CALL, r.profile)
    }

    @Test
    fun isReadyForOfflineReturnsNoConnection() = runTest {
        val core = build(
            Config(historyMode = HistoryMode.LAST_LOCAL, endpoint = "https://e"),
            connectivity = FakeConnectivity(connected = false),
        )
        val r = core.isReadyFor(Profile.VIDEO_CALL)
        assertFalse(r.passed)
        assertEquals("no connection", r.reason)
    }

    @Test
    fun pingReturnsLatency() = runTest {
        val core = build(
            Config(historyMode = HistoryMode.LAST_LOCAL, endpoint = "https://e"),
            http = FakeHttpClient(pingMs = 33.0, profiles = table),
        )
        assertEquals(33.0, core.ping(), 1e-9)
    }

    @Test
    fun getHistoryReturnsLastLocalOnly() = runTest {
        val lastStore = FakeLastResultStore()
        val core = build(
            Config(historyMode = HistoryMode.LAST_LOCAL, endpoint = "https://e"),
            lastStore = lastStore,
        )
        core.runTest() // populates last local
        val history = core.getHistory(limit = 10)
        assertEquals(1, history.size)
    }

    @Test
    fun getHistoryMergesServerInServerHistoryMode() = runTest {
        val serverResult = com.pingit.core.model.TestResult(
            downloadMbps = 9.0, uploadMbps = 4.0, latencyMs = 30.0, jitterMs = 2.0,
            packetLossPct = 0.0, score = 70, label = "Good", timestamp = 999_999L,
        )
        val http = FakeHttpClient(
            downloadMbps = 50.0, uploadMbps = 20.0, pingMs = 20.0, profiles = table,
            serverHistory = listOf(serverResult),
        )
        val lastStore = FakeLastResultStore()
        val core = build(
            Config(historyMode = HistoryMode.SERVER_HISTORY, endpoint = "https://e"),
            http = http, lastStore = lastStore,
        )
        core.runTest()
        val history = core.getHistory(limit = 10)
        // Local (ts 123) + server (ts 999999), newest-first.
        assertEquals(2, history.size)
        assertEquals(999_999L, history.first().timestamp)
    }

    @Test
    fun refreshProfilesForcesFetch() = runTest {
        val http = FakeHttpClient(
            profiles = ProfileTable(version = 99, profiles = emptyList()),
        )
        val core = build(
            Config(historyMode = HistoryMode.LAST_LOCAL, endpoint = "https://e"),
            http = http,
        )
        val refreshed = core.refreshProfiles()
        assertEquals(99, refreshed.version)
        assertTrue(http.fetchProfilesCalls >= 1)
    }

    @Test
    fun cancelDoesNotThrow() = runTest {
        val core = build(Config(historyMode = HistoryMode.LAST_LOCAL, endpoint = "https://e"))
        core.cancel() // no in-flight work; should be a no-op
    }
}
