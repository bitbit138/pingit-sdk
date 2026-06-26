package com.pingit.android.crash

import android.content.Context
import com.pingit.android.store.OutboxItemRecord
import com.pingit.android.store.storeJson
import com.pingit.android.store.toRecord
import com.pingit.core.io.CrashSink
import com.pingit.core.io.OutboxKind
import com.pingit.core.model.TestResult
import java.io.File
import java.util.UUID

/**
 * Synchronous, file-backed [CrashSink]. Because it runs from an uncaught
 * exception handler, it must not rely on coroutines/DataStore (which are async).
 * Each crash is appended as one JSON line to `pingit_crashes.log`. The
 * [com.pingit.android.work.UploadWorker] drains this file into the outbox.
 */
class FileCrashSink(context: Context) : CrashSink {

    private val file = File(context.applicationContext.filesDir, FILE_NAME)

    override fun persistCrashSync(t: Throwable, last: TestResult?) {
        val record = OutboxItemRecord(
            id = UUID.randomUUID().toString(),
            kind = OutboxKind.CRASH.name,
            result = last?.toRecord(),
            crashMessage = t.message ?: t.javaClass.name,
            crashStack = t.stackTraceToString(),
        )
        val line = storeJson.encodeToString(OutboxItemRecord.serializer(), record)
        runCatching {
            synchronized(this) {
                file.appendText(line + "\n", Charsets.UTF_8)
            }
        }
    }

    /** Read and clear pending crash records (called from the worker). */
    fun drain(): List<OutboxItemRecord> = synchronized(this) {
        if (!file.exists()) return emptyList()
        val lines = file.readLines(Charsets.UTF_8).filter { it.isNotBlank() }
        file.delete()
        lines.mapNotNull { line ->
            runCatching {
                storeJson.decodeFromString(OutboxItemRecord.serializer(), line)
            }.getOrNull()
        }
    }

    companion object {
        private const val FILE_NAME = "pingit_crashes.log"
    }
}
