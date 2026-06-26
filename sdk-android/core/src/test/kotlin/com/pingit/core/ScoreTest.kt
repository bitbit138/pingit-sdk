package com.pingit.core

import com.pingit.core.score.Score
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class ScoreTest {

    @Test
    fun scoreClampedToZeroForTerribleLink() {
        val m = Score.Metrics(download = 0.0, upload = 0.0, latency = 5000.0, jitter = 500.0, loss = 100.0)
        assertEquals(0, Score.score(m))
    }

    @Test
    fun scoreClampedTo100ForGreatLink() {
        val m = Score.Metrics(download = 1000.0, upload = 1000.0, latency = 1.0, jitter = 0.0, loss = 0.0)
        assertEquals(100, Score.score(m))
    }

    @Test
    fun scoreIsBetweenZeroAndHundred() {
        val m = Score.Metrics(download = 12.0, upload = 4.0, latency = 120.0, jitter = 12.0, loss = 1.0)
        val s = Score.score(m)
        assertTrue(s in 0..100, "score $s out of range")
    }

    @Test
    fun betterLinkScoresHigher() {
        val worse = Score.score(Score.Metrics(5.0, 1.0, 200.0, 30.0, 4.0))
        val better = Score.score(Score.Metrics(50.0, 20.0, 20.0, 2.0, 0.0))
        assertTrue(better > worse, "expected $better > $worse")
    }

    @Test
    fun labelBuckets() {
        assertEquals("Poor", Score.label(0))
        assertEquals("Poor", Score.label(39))
        assertEquals("Fair", Score.label(40))
        assertEquals("Fair", Score.label(59))
        assertEquals("Good", Score.label(60))
        assertEquals("Good", Score.label(84))
        assertEquals("Excellent", Score.label(85))
        assertEquals("Excellent", Score.label(100))
    }
}
