package com.pingit.core.measure

import kotlin.math.abs

/** Pure functions for latency / jitter computation over a list of RTT samples. */
object Jitter {

    /** Arithmetic mean of the latency samples in milliseconds. Empty -> 0.0. */
    fun averageLatencyMs(samples: List<Double>): Double {
        if (samples.isEmpty()) return 0.0
        return samples.sum() / samples.size
    }

    /**
     * RFC 3550 style jitter: the mean of the absolute differences between
     * consecutive round-trip times. With 0 or 1 sample there are no consecutive
     * pairs, so jitter is 0.0.
     */
    fun jitterMs(samples: List<Double>): Double {
        if (samples.size < 2) return 0.0
        var sum = 0.0
        for (i in 1 until samples.size) {
            sum += abs(samples[i] - samples[i - 1])
        }
        return sum / (samples.size - 1)
    }
}
