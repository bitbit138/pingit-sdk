package com.pingit.core

import com.pingit.core.eval.Evaluator
import com.pingit.core.model.Range
import com.pingit.core.model.Requires
import com.pingit.core.score.Score
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class EvaluatorTest {

    private fun metrics(
        download: Double = 100.0,
        upload: Double = 100.0,
        latency: Double = 10.0,
        jitter: Double = 1.0,
        loss: Double = 0.0,
    ) = Score.Metrics(download, upload, latency, jitter, loss)

    private val full = Requires(
        downloadMbps = Range(min = 10.0),
        uploadMbps = Range(min = 5.0),
        latencyMs = Range(max = 100.0),
        jitterMs = Range(max = 30.0),
        packetLossPct = Range(max = 2.0),
    )

    @Test
    fun allPass() {
        val v = Evaluator.evaluate(full, metrics())
        assertTrue(v.passed)
        assertEquals("ok", v.reason)
    }

    @Test
    fun downloadTooLow() {
        val v = Evaluator.evaluate(full, metrics(download = 1.0))
        assertFalse(v.passed)
        assertEquals("download too low", v.reason)
    }

    @Test
    fun uploadTooLow() {
        val v = Evaluator.evaluate(full, metrics(upload = 1.0))
        assertFalse(v.passed)
        assertEquals("upload too low", v.reason)
    }

    @Test
    fun latencyTooHigh() {
        val v = Evaluator.evaluate(full, metrics(latency = 500.0))
        assertFalse(v.passed)
        assertEquals("latency too high", v.reason)
    }

    @Test
    fun jitterTooHigh() {
        val v = Evaluator.evaluate(full, metrics(jitter = 100.0))
        assertFalse(v.passed)
        assertEquals("jitter too high", v.reason)
    }

    @Test
    fun packetLossTooHigh() {
        val v = Evaluator.evaluate(full, metrics(loss = 50.0))
        assertFalse(v.passed)
        assertEquals("packet loss too high", v.reason)
    }

    @Test
    fun evaluationOrderShortCircuitsAtFirstFailure() {
        // Both download and latency fail; download is checked first.
        val v = Evaluator.evaluate(full, metrics(download = 1.0, latency = 9999.0))
        assertEquals("download too low", v.reason)
    }

    @Test
    fun nullRangesAreSkipped() {
        // No requirements at all -> always passes regardless of metrics.
        val v = Evaluator.evaluate(Requires(), metrics(download = 0.0, latency = 99999.0, loss = 100.0))
        assertTrue(v.passed)
        assertEquals("ok", v.reason)
    }

    @Test
    fun boundaryValuesPass() {
        // Exactly at min/max should pass (inclusive).
        val v = Evaluator.evaluate(
            full,
            metrics(download = 10.0, upload = 5.0, latency = 100.0, jitter = 30.0, loss = 2.0),
        )
        assertTrue(v.passed)
    }
}
