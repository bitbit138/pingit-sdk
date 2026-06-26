package com.pingit.core

import com.pingit.core.history.HistoryPolicy
import com.pingit.core.model.HistoryMode
import com.pingit.core.model.TestResult
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class HistoryPolicyTest {

    private fun result(ts: Long, score: Int = 70) = TestResult(
        downloadMbps = 10.0,
        uploadMbps = 5.0,
        latencyMs = 30.0,
        jitterMs = 2.0,
        packetLossPct = 0.0,
        score = score,
        label = "Good",
        timestamp = ts,
    )

    @Test
    fun persistLastLocalForNonNoneModes() {
        assertFalse(HistoryPolicy.shouldPersistLastLocal(HistoryMode.NONE))
        assertTrue(HistoryPolicy.shouldPersistLastLocal(HistoryMode.LAST_LOCAL))
        assertTrue(HistoryPolicy.shouldPersistLastLocal(HistoryMode.SERVER_HISTORY))
    }

    @Test
    fun enqueueServerOnlyForServerHistory() {
        assertFalse(HistoryPolicy.shouldEnqueueServer(HistoryMode.NONE))
        assertFalse(HistoryPolicy.shouldEnqueueServer(HistoryMode.LAST_LOCAL))
        assertTrue(HistoryPolicy.shouldEnqueueServer(HistoryMode.SERVER_HISTORY))
    }

    @Test
    fun noneModeHasNoHistory() {
        val out = HistoryPolicy.historyFor(HistoryMode.NONE, result(1), listOf(result(2)), 10)
        assertTrue(out.isEmpty())
    }

    @Test
    fun lastLocalReturnsOnlyLocal() {
        val out = HistoryPolicy.historyFor(HistoryMode.LAST_LOCAL, result(5), listOf(result(1), result(2)), 10)
        assertEquals(1, out.size)
        assertEquals(5L, out.first().timestamp)
    }

    @Test
    fun lastLocalWithNoLocalIsEmpty() {
        val out = HistoryPolicy.historyFor(HistoryMode.LAST_LOCAL, null, listOf(result(1)), 10)
        assertTrue(out.isEmpty())
    }

    @Test
    fun serverHistoryMergesNewestFirstAndDeduplicates() {
        val local = result(30)
        val server = listOf(result(10), result(20), result(30)) // ts 30 duplicates local
        val out = HistoryPolicy.historyFor(HistoryMode.SERVER_HISTORY, local, server, 10)
        assertEquals(listOf(30L, 20L, 10L), out.map { it.timestamp })
    }

    @Test
    fun serverHistoryRespectsLimit() {
        val server = (1..10).map { result(it.toLong()) }
        val out = HistoryPolicy.historyFor(HistoryMode.SERVER_HISTORY, null, server, 3)
        assertEquals(3, out.size)
        assertEquals(listOf(10L, 9L, 8L), out.map { it.timestamp })
    }

    @Test
    fun zeroLimitIsEmpty() {
        val out = HistoryPolicy.historyFor(HistoryMode.SERVER_HISTORY, result(1), listOf(result(2)), 0)
        assertTrue(out.isEmpty())
    }
}
