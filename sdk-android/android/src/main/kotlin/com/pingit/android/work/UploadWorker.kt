package com.pingit.android.work

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.pingit.android.crash.FileCrashSink
import com.pingit.android.net.Endpoints
import com.pingit.android.net.OkHttpHttpClient
import com.pingit.android.store.DataStoreOutbox
import com.pingit.android.store.UploadConfigStore
import com.pingit.android.store.toModel
import com.pingit.core.fallback.Target
import com.pingit.core.io.Clock
import com.pingit.core.io.OutboxKind
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

/**
 * Drains the outbox: POSTs queued results to `/results` and crashes to
 * `/crashes`. Returns [Result.retry] (with exponential backoff configured by
 * the enqueuer) on transient failure so pending items are preserved.
 */
class UploadWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {

    private val clock = object : Clock {
        override fun nowMillis() = System.currentTimeMillis()
        override fun nanoTime() = System.nanoTime()
    }

    override suspend fun doWork(): Result {
        val config = UploadConfigStore(applicationContext).read() ?: return Result.success()
        val endpoints = Endpoints(config.endpoint, config.fallbackEndpoint)
        val http = OkHttpHttpClient(endpoints, clock)
        val outbox = DataStoreOutbox(applicationContext)
        val crashSink = FileCrashSink(applicationContext)

        // Move any synchronously-persisted crashes into the durable outbox first.
        for (record in crashSink.drain()) {
            val item = record.toModel()
            outbox.enqueueCrash(item.crashMessage ?: "crash", item.crashStack)
        }

        var anyFailure = false
        for (item in outbox.peekAll()) {
            val ok = runCatching {
                when (item.kind) {
                    OutboxKind.RESULT -> item.result?.let {
                        http.postResult(Target.PRIMARY, config.appId, config.deviceId, it)
                    }
                    OutboxKind.CRASH -> postCrash(config, item.crashMessage, item.crashStack)
                }
                true
            }.getOrDefault(false)
            if (ok) outbox.remove(item.id) else anyFailure = true
        }

        return if (anyFailure) Result.retry() else Result.success()
    }

    private fun postCrash(
        config: com.pingit.android.store.UploadConfig,
        message: String?,
        stack: String?,
    ) {
        // Minimal crash upload via OkHttp directly (no core DTO for crashes).
        val url = (if (config.endpoint.endsWith("/")) config.endpoint else config.endpoint + "/") + "crashes"
        val body = buildString {
            append("{")
            append("\"appId\":").append(jsonString(config.appId)).append(",")
            append("\"deviceId\":").append(jsonString(config.deviceId)).append(",")
            append("\"message\":").append(jsonString(message ?: "")).append(",")
            append("\"stack\":").append(jsonString(stack ?: ""))
            append("}")
        }
        val mediaType = "application/json; charset=utf-8".toMediaType()
        val request = Request.Builder()
            .url(url)
            .post(body.toRequestBody(mediaType))
            .build()
        OkHttpHttpClient.defaultClient().newCall(request).execute().use { response ->
            check(response.isSuccessful) { "crash upload failed: ${response.code}" }
        }
    }

    private fun jsonString(s: String): String {
        val escaped = s
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
            .replace("\r", "\\r")
            .replace("\t", "\\t")
        return "\"$escaped\""
    }
}
