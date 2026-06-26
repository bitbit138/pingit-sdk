package com.pingit.core

import com.pingit.core.measure.Throughput
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class ThroughputTest {

    @Test
    fun mbpsGuardsNonPositiveNanos() {
        assertEquals(0.0, Throughput.mbps(1000, 0L), 1e-9)
        assertEquals(0.0, Throughput.mbps(1000, -5L), 1e-9)
    }

    @Test
    fun mbpsConvertsBytesAndNanos() {
        // 1_000_000 bytes in 1 second = 8 Mbps
        assertEquals(8.0, Throughput.mbps(1_000_000L, 1_000_000_000L), 1e-6)
    }

    @Test
    fun effectiveMbpsReturnsZeroForTooFewSamples() {
        assertEquals(0.0, Throughput.effectiveMbps(emptyList()), 1e-9)
        assertEquals(0.0, Throughput.effectiveMbps(listOf(Throughput.Sample(0, 0))), 1e-9)
    }

    @Test
    fun effectiveMbpsIgnoresWarmupAndMatchesSteadyState() {
        // Warm-up: slow first 300ms (only 100 KB). Then steady 10 MB over 1s.
        val msToNanos = 1_000_000L
        val samples = listOf(
            Throughput.Sample(0L, 0L),
            Throughput.Sample(100_000L, 300L * msToNanos), // end of warm-up
            Throughput.Sample(5_100_000L, 800L * msToNanos),
            Throughput.Sample(10_100_000L, 1300L * msToNanos),
        )
        val mbps = Throughput.effectiveMbps(samples, skipMillis = 250L, skipFraction = 0.0)
        // steady window: 10_000_000 bytes over 1.0s = 80 Mbps
        assertEquals(80.0, mbps, 0.5)
    }

    @Test
    fun nextChunkBytesRespectsCapAndFloor() {
        // Slow link -> small chunk, but never below 32 KiB unless remaining smaller
        val slow = Throughput.nextChunkBytes(currentMbps = 0.0, sentBytes = 0L, cap = 10L * 1024 * 1024)
        assertTrue(slow >= 32L * 1024)

        // Near the cap -> clamp to remaining
        val nearCap = Throughput.nextChunkBytes(currentMbps = 100.0, sentBytes = 9_900_000L, cap = 10_000_000L)
        assertEquals(100_000L, nearCap)

        // At/over cap -> 0
        assertEquals(0L, Throughput.nextChunkBytes(50.0, 10_000_000L, 10_000_000L))
    }

    @Test
    fun nextChunkBytesNeverExceedsCeiling() {
        val chunk = Throughput.nextChunkBytes(currentMbps = 10_000.0, sentBytes = 0L, cap = Long.MAX_VALUE)
        assertTrue(chunk <= 1L * 1024 * 1024)
    }
}
