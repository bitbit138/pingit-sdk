package com.pingit.core.history

import com.pingit.core.model.HistoryMode
import com.pingit.core.model.TestResult

object HistoryPolicy {

    /** Persist the latest result locally for any mode other than NONE. */
    fun shouldPersistLastLocal(mode: HistoryMode): Boolean = mode != HistoryMode.NONE

    /** Enqueue for server upload only in SERVER_HISTORY mode. */
    fun shouldEnqueueServer(mode: HistoryMode): Boolean = mode == HistoryMode.SERVER_HISTORY

    /**
     * Compose the history list (newest-first, capped at [limit]) from the
     * locally stored [lastLocal] result and any [serverResults].
     *
     *  - NONE: no history.
     *  - LAST_LOCAL: just the last local result, if any.
     *  - SERVER_HISTORY: merge server results with the last local result,
     *    de-duplicated by timestamp, sorted newest-first.
     */
    fun historyFor(
        mode: HistoryMode,
        lastLocal: TestResult?,
        serverResults: List<TestResult>,
        limit: Int,
    ): List<TestResult> {
        if (limit <= 0) return emptyList()
        return when (mode) {
            HistoryMode.NONE -> emptyList()
            HistoryMode.LAST_LOCAL -> listOfNotNull(lastLocal).take(limit)
            HistoryMode.SERVER_HISTORY -> {
                val merged = LinkedHashMap<Long, TestResult>()
                lastLocal?.let { merged[it.timestamp] = it }
                for (r in serverResults) merged.putIfAbsent(r.timestamp, r)
                merged.values
                    .sortedByDescending { it.timestamp }
                    .take(limit)
            }
        }
    }
}
