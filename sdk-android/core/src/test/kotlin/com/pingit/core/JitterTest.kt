package com.pingit.core

import com.pingit.core.measure.Jitter
import org.junit.Test
import kotlin.test.assertEquals

class JitterTest {

    @Test
    fun averageOfEmptyIsZero() {
        assertEquals(0.0, Jitter.averageLatencyMs(emptyList()), 1e-9)
    }

    @Test
    fun averageComputesMean() {
        assertEquals(20.0, Jitter.averageLatencyMs(listOf(10.0, 20.0, 30.0)), 1e-9)
    }

    @Test
    fun jitterZeroForFewerThanTwoSamples() {
        assertEquals(0.0, Jitter.jitterMs(emptyList()), 1e-9)
        assertEquals(0.0, Jitter.jitterMs(listOf(42.0)), 1e-9)
    }

    @Test
    fun jitterIsMeanAbsoluteDeviationOfConsecutiveRtts() {
        // diffs: |20-10|=10, |15-20|=5, |25-15|=10 -> mean = 25/3
        val rtts = listOf(10.0, 20.0, 15.0, 25.0)
        assertEquals(25.0 / 3.0, Jitter.jitterMs(rtts), 1e-9)
    }

    @Test
    fun jitterZeroForConstantRtts() {
        assertEquals(0.0, Jitter.jitterMs(listOf(30.0, 30.0, 30.0)), 1e-9)
    }
}
