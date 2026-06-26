package com.pingit.core.eval

import com.pingit.core.io.Connectivity
import com.pingit.core.measure.MeasurementService
import com.pingit.core.model.Profile
import com.pingit.core.model.ProfileTable
import com.pingit.core.model.ReadinessResult
import com.pingit.core.model.Requires
import com.pingit.core.model.TestResult
import com.pingit.core.score.Score

/**
 * Combines connectivity + a measurement + the active profile table into a
 * [ReadinessResult] for a given [Profile].
 */
class ReadinessService(
    private val connectivity: Connectivity,
    private val measurement: MeasurementService,
) {

    /**
     * Evaluate readiness for [profile] using [table] to look up requirements.
     * If offline, returns immediately without measuring. If the profile is not
     * in the table, treats it as having no requirements (passes).
     */
    suspend fun isReadyFor(profile: Profile, table: ProfileTable): ReadinessResult {
        if (!connectivity.isConnected()) {
            return ReadinessResult(profile, passed = false, reason = "no connection", measured = null)
        }
        val measured: TestResult = measurement.runTest()
        val requires: Requires = table.requiresFor(profile) ?: Requires()
        val metrics = Score.Metrics(
            download = measured.downloadMbps,
            upload = measured.uploadMbps,
            latency = measured.latencyMs,
            jitter = measured.jitterMs,
            loss = measured.packetLossPct,
        )
        val verdict = Evaluator.evaluate(requires, metrics)
        return ReadinessResult(
            profile = profile,
            passed = verdict.passed,
            reason = verdict.reason,
            measured = measured,
        )
    }
}
