package com.pingit.core.eval

import com.pingit.core.model.Range
import com.pingit.core.model.Requires
import com.pingit.core.score.Score

object Evaluator {

    /** Verdict for a single readiness evaluation. */
    data class Verdict(val passed: Boolean, val reason: String)

    /**
     * Evaluate measured [m] against [requires] in a fixed order:
     * download -> upload -> latency -> jitter -> loss. The first failing
     * constraint short-circuits with its reason. Null ranges are skipped.
     */
    fun evaluate(requires: Requires, m: Score.Metrics): Verdict {
        if (belowMin(requires.downloadMbps, m.download)) {
            return Verdict(false, "download too low")
        }
        if (belowMin(requires.uploadMbps, m.upload)) {
            return Verdict(false, "upload too low")
        }
        if (aboveMax(requires.latencyMs, m.latency)) {
            return Verdict(false, "latency too high")
        }
        if (aboveMax(requires.jitterMs, m.jitter)) {
            return Verdict(false, "jitter too high")
        }
        if (aboveMax(requires.packetLossPct, m.loss)) {
            return Verdict(false, "packet loss too high")
        }
        return Verdict(true, "ok")
    }

    /** True if [range] has a min and [value] is strictly below it. */
    private fun belowMin(range: Range?, value: Double): Boolean {
        val min = range?.min ?: return false
        return value < min
    }

    /** True if [range] has a max and [value] is strictly above it. */
    private fun aboveMax(range: Range?, value: Double): Boolean {
        val max = range?.max ?: return false
        return value > max
    }
}
