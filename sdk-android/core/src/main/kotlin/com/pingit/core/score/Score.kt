package com.pingit.core.score

import kotlin.math.max
import kotlin.math.min

object Score {

    /** Raw measured metrics used to compute a quality score. */
    data class Metrics(
        val download: Double,
        val upload: Double,
        val latency: Double,
        val jitter: Double,
        val loss: Double,
    )

    /**
     * Weighted 0..100 score. Each sub-metric is normalized to a 0..1 sub-score,
     * combined with weights, then scaled and clamped.
     *
     * Weights: download 0.35, upload 0.15, latency 0.25, jitter 0.10, loss 0.15.
     */
    fun score(m: Metrics): Int {
        val downloadScore = saturating(m.download, full = 25.0)
        val uploadScore = saturating(m.upload, full = 10.0)
        val latencyScore = decreasing(m.latency, good = 20.0, bad = 300.0)
        val jitterScore = decreasing(m.jitter, good = 5.0, bad = 60.0)
        val lossScore = decreasing(m.loss, good = 0.0, bad = 10.0)

        val combined =
            0.35 * downloadScore +
                0.15 * uploadScore +
                0.25 * latencyScore +
                0.10 * jitterScore +
                0.15 * lossScore

        return (combined * 100.0).toInt().coerceIn(0, 100)
    }

    /** Map a "more is better" metric to 0..1, reaching 1.0 at [full]. */
    private fun saturating(value: Double, full: Double): Double {
        if (value <= 0.0) return 0.0
        return min(1.0, value / full)
    }

    /**
     * Map a "less is better" metric to 0..1: 1.0 at or below [good], 0.0 at or
     * above [bad], linear in between.
     */
    private fun decreasing(value: Double, good: Double, bad: Double): Double {
        if (value <= good) return 1.0
        if (value >= bad) return 0.0
        return max(0.0, 1.0 - (value - good) / (bad - good))
    }

    /** Bucket a numeric score into a human label. */
    fun label(score: Int): String = when {
        score < 40 -> "Poor"
        score < 60 -> "Fair"
        score < 85 -> "Good"
        else -> "Excellent"
    }
}
