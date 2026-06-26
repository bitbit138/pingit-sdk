package com.pingit.core

import com.pingit.core.eval.ReadinessService
import com.pingit.core.fallback.Target
import com.pingit.core.measure.MeasurementService
import com.pingit.core.model.Profile
import com.pingit.core.model.ProfileSpec
import com.pingit.core.model.ProfileTable
import com.pingit.core.model.Range
import com.pingit.core.model.Requires
import kotlinx.coroutines.test.runTest
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ReadinessServiceTest {

    private val table = ProfileTable(
        version = 1,
        profiles = listOf(
            ProfileSpec(
                Profile.VIDEO_CALL,
                Requires(
                    downloadMbps = Range(min = 1.5),
                    uploadMbps = Range(min = 1.0),
                    latencyMs = Range(max = 200.0),
                ),
            ),
        ),
    )

    private fun service(http: FakeHttpClient, connectivity: FakeConnectivity): ReadinessService {
        val clock = FakeClock(millis = 1_000L)
        val measurement = MeasurementService(http, clock, dataSaver = false) { Target.PRIMARY }
        return ReadinessService(connectivity, measurement)
    }

    @Test
    fun offlineReturnsNoConnection() = runTest {
        val svc = service(FakeHttpClient(), FakeConnectivity(connected = false))
        val r = svc.isReadyFor(Profile.VIDEO_CALL, table)
        assertFalse(r.passed)
        assertEquals("no connection", r.reason)
        assertNull(r.measured)
        assertEquals(Profile.VIDEO_CALL, r.profile)
    }

    @Test
    fun goodLinkPasses() = runTest {
        val http = FakeHttpClient(downloadMbps = 50.0, uploadMbps = 20.0, pingMs = 20.0)
        val svc = service(http, FakeConnectivity(connected = true))
        val r = svc.isReadyFor(Profile.VIDEO_CALL, table)
        assertTrue(r.passed, "expected pass, got ${r.reason}")
        assertEquals("ok", r.reason)
        assertTrue(r.measured != null)
    }

    @Test
    fun slowLinkFailsWithReason() = runTest {
        val http = FakeHttpClient(downloadMbps = 0.5, uploadMbps = 20.0, pingMs = 20.0)
        val svc = service(http, FakeConnectivity(connected = true))
        val r = svc.isReadyFor(Profile.VIDEO_CALL, table)
        assertFalse(r.passed)
        assertEquals("download too low", r.reason)
        assertTrue(r.measured != null)
    }
}
