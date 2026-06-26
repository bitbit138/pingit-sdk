package com.pingit.core

import com.pingit.core.fallback.Target
import com.pingit.core.measure.MeasurementService
import kotlinx.coroutines.test.runTest
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class MeasurementServiceTest {

    @Test
    fun runTestProducesScoredResult() = runTest {
        val http = FakeHttpClient(downloadMbps = 50.0, uploadMbps = 20.0, pingMs = 25.0)
        val clock = FakeClock(millis = 42L)
        val svc = MeasurementService(http, clock, dataSaver = false) { Target.PRIMARY }

        val result = svc.runTest()
        assertEquals(25.0, result.latencyMs, 1e-6)
        // Constant ping -> zero jitter.
        assertEquals(0.0, result.jitterMs, 1e-6)
        // v1 packet loss is always 0.
        assertEquals(0.0, result.packetLossPct, 1e-9)
        assertEquals(42L, result.timestamp)
        assertTrue(result.downloadMbps > 0.0)
        assertTrue(result.uploadMbps > 0.0)
        assertTrue(result.score in 0..100)
        assertTrue(result.label.isNotEmpty())
    }

    @Test
    fun uploadThroughputMatchesTiming() = runTest {
        val http = FakeHttpClient(downloadMbps = 10.0, uploadMbps = 8.0, pingMs = 10.0)
        val svc = MeasurementService(http, FakeClock(), dataSaver = true) { Target.PRIMARY }
        val result = svc.runTest()
        // FakeHttpClient times upload to reproduce ~8 Mbps.
        assertEquals(8.0, result.uploadMbps, 0.1)
    }

    @Test
    fun pingDelegatesToHttp() = runTest {
        val http = FakeHttpClient(pingMs = 99.0)
        val svc = MeasurementService(http, FakeClock(), dataSaver = false) { Target.PRIMARY }
        assertEquals(99.0, svc.ping(), 1e-9)
    }
}
