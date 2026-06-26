package com.pingit.core.measure

/** Pure functions for converting transferred bytes / elapsed time into Mbps. */
object Throughput {

    /**
     * Convert [bytes] transferred over [nanos] nanoseconds into megabits/sec.
     * Guards against non-positive durations (returns 0.0).
     */
    fun mbps(bytes: Long, nanos: Long): Double {
        if (nanos <= 0L) return 0.0
        val seconds = nanos / 1e9
        return bytes * 8.0 / seconds / 1e6
    }

    /** A cumulative-bytes sample captured at a monotonic timestamp. */
    data class Sample(val cumulativeBytes: Long, val atNanos: Long)

    /**
     * Compute effective throughput from a series of cumulative samples,
     * discarding an initial warm-up window. We drop everything before the first
     * sample that is at least [skipMillis] after the start, and also at least
     * [skipFraction] of the total bytes in. The remaining window's byte/time
     * deltas are converted with [mbps].
     */
    fun effectiveMbps(
        samples: List<Sample>,
        skipMillis: Long = 250L,
        skipFraction: Double = 0.10,
    ): Double {
        if (samples.size < 2) return 0.0
        val sorted = samples.sortedBy { it.atNanos }
        val startNanos = sorted.first().atNanos
        val totalBytes = sorted.last().cumulativeBytes - sorted.first().cumulativeBytes
        if (totalBytes <= 0L) return 0.0

        val skipNanos = skipMillis * 1_000_000L
        val skipBytes = sorted.first().cumulativeBytes + (totalBytes * skipFraction).toLong()

        // The baseline is the FIRST sample past the warm-up window (in both time
        // and bytes); throughput is measured from there to the final sample. The
        // last sample never qualifies as a baseline (it would leave no window).
        val last = sorted.last()
        var baseline = sorted.first()
        for (i in sorted.indices) {
            if (i == sorted.lastIndex) break
            val s = sorted[i]
            val pastTime = s.atNanos - startNanos >= skipNanos
            val pastBytes = s.cumulativeBytes >= skipBytes
            if (pastTime && pastBytes) {
                baseline = s
                break
            }
        }
        val byteDelta = last.cumulativeBytes - baseline.cumulativeBytes
        val nanoDelta = last.atNanos - baseline.atNanos
        if (byteDelta <= 0L || nanoDelta <= 0L) {
            // Warm-up consumed everything; fall back to the whole-run rate.
            return mbps(totalBytes, last.atNanos - startNanos)
        }
        return mbps(byteDelta, nanoDelta)
    }

    /**
     * Adaptive chunk sizing for upload/download loops. Grows the chunk based on
     * the currently observed [currentMbps] so faster links transfer in fewer,
     * larger chunks, while never exceeding the remaining budget ([cap] minus
     * [sentBytes]). Always returns at least a small floor (until the cap is hit).
     */
    fun nextChunkBytes(currentMbps: Double, sentBytes: Long, cap: Long): Long {
        val remaining = cap - sentBytes
        if (remaining <= 0L) return 0L

        val floor = 32L * 1024L              // 32 KiB minimum
        val ceiling = 1L * 1024L * 1024L     // 1 MiB maximum per chunk
        // Aim for roughly 100ms worth of data at the observed rate.
        val targetBytes = if (currentMbps > 0.0) {
            (currentMbps * 1e6 / 8.0 * 0.1).toLong()
        } else {
            floor
        }
        val chunk = targetBytes.coerceIn(floor, ceiling)
        return chunk.coerceAtMost(remaining)
    }
}
