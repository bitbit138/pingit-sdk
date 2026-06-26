package com.pingit.core.measure

import com.pingit.core.fallback.Target
import com.pingit.core.io.Clock
import com.pingit.core.io.HttpClient
import com.pingit.core.score.Score
import com.pingit.core.model.TestResult
import kotlin.coroutines.coroutineContext
import kotlinx.coroutines.ensureActive

/**
 * Drives a single end-to-end measurement: download throughput, upload
 * throughput, latency + jitter via repeated pings, then scores and labels the
 * result. Cooperatively cancellable.
 */
class MeasurementService(
    private val http: HttpClient,
    private val clock: Clock,
    private val dataSaver: Boolean,
    private val targetProvider: suspend () -> Target,
) {

    /** Run the full test and produce a scored [TestResult]. */
    suspend fun runTest(): TestResult {
        val plan = DataSaverPlan.planFor(dataSaver)
        val target = targetProvider()

        // --- Download ---
        val samples = ArrayList<Throughput.Sample>()
        http.download(target, plan.downloadBytesCap) { cumulative, atNanos ->
            samples.add(Throughput.Sample(cumulative, atNanos))
        }
        coroutineContext.ensureActive()
        val downloadMbps = Throughput.effectiveMbps(samples)

        // --- Upload ---
        val up = http.upload(target, plan.uploadBytesCap)
        coroutineContext.ensureActive()
        val uploadMbps = Throughput.mbps(up.bytes, up.nanos)

        // --- Latency + jitter ---
        val rtts = ArrayList<Double>(plan.pingCount)
        repeat(plan.pingCount) {
            coroutineContext.ensureActive()
            rtts.add(http.ping(target))
        }
        val latencyMs = Jitter.averageLatencyMs(rtts)
        val jitterMs = Jitter.jitterMs(rtts)

        // v1 does not measure packet loss.
        val packetLossPct = 0.0

        val metrics = Score.Metrics(
            download = downloadMbps,
            upload = uploadMbps,
            latency = latencyMs,
            jitter = jitterMs,
            loss = packetLossPct,
        )
        val score = Score.score(metrics)
        return TestResult(
            downloadMbps = downloadMbps,
            uploadMbps = uploadMbps,
            latencyMs = latencyMs,
            jitterMs = jitterMs,
            packetLossPct = packetLossPct,
            score = score,
            label = Score.label(score),
            timestamp = clock.nowMillis(),
        )
    }

    /** A single round-trip latency probe, in milliseconds. */
    suspend fun ping(): Double {
        val target = targetProvider()
        return http.ping(target)
    }
}
