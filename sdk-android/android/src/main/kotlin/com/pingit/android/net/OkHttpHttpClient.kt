package com.pingit.android.net

import com.pingit.core.fallback.Target
import com.pingit.core.io.Clock
import com.pingit.core.io.HttpClient
import com.pingit.core.io.UploadTiming
import com.pingit.core.json.ProfilesResponseDto
import com.pingit.core.json.ResultDto
import com.pingit.core.json.toModel
import com.pingit.core.json.toResultDto
import com.pingit.core.json.toTestResult
import com.pingit.core.model.ProfileTable
import com.pingit.core.model.TestResult
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.withContext
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.internal.closeQuietly
import okio.BufferedSink
import java.util.concurrent.TimeUnit
import kotlin.coroutines.coroutineContext

/**
 * OkHttp-backed [HttpClient]. Server endpoints (relative to the base URL):
 *   GET  /download?bytes=N    -> streams N bytes
 *   POST /upload              -> consumes the request body
 *   GET  /ping                -> tiny response, timed
 *   GET  /profiles            -> ProfilesResponseDto JSON
 *   POST /results             -> ResultDto JSON
 *   GET  /results?appId&deviceId&limit -> [ResultDto] JSON
 */
class OkHttpHttpClient(
    private val endpoints: Endpoints,
    private val clock: Clock,
    private val client: OkHttpClient = defaultClient(),
    private val json: Json = Json { ignoreUnknownKeys = true; encodeDefaults = true },
) : HttpClient {

    private val jsonMedia = "application/json; charset=utf-8".toMediaType()
    private val octetMedia = "application/octet-stream".toMediaType()

    override suspend fun download(target: Target, bytes: Long, onSample: (Long, Long) -> Unit) =
        withContext(Dispatchers.IO) {
            val url = endpoints.baseUrl(target) + "download?bytes=$bytes"
            val request = Request.Builder().url(url).get().build()
            client.newCall(request).execute().use { response ->
                val body = response.body ?: error("empty download body")
                val source = body.byteStream()
                val buffer = ByteArray(64 * 1024)
                var cumulative = 0L
                val start = clock.nanoTime()
                onSample(0L, 0L)
                while (true) {
                    coroutineContext.ensureActive()
                    val read = source.read(buffer)
                    if (read < 0) break
                    cumulative += read
                    onSample(cumulative, clock.nanoTime() - start)
                    if (cumulative >= bytes) break
                }
                source.closeQuietly()
            }
        }

    override suspend fun upload(target: Target, bytes: Long): UploadTiming =
        withContext(Dispatchers.IO) {
            val url = endpoints.baseUrl(target) + "upload"
            val body = streamingBody(bytes)
            val request = Request.Builder().url(url).post(body).build()
            val start = clock.nanoTime()
            client.newCall(request).execute().use { /* drain */ it.body?.close() }
            UploadTiming(bytes = bytes, nanos = clock.nanoTime() - start)
        }

    override suspend fun ping(target: Target): Double = withContext(Dispatchers.IO) {
        val url = endpoints.baseUrl(target) + "ping"
        val request = Request.Builder().url(url).get().build()
        val start = clock.nanoTime()
        client.newCall(request).execute().use { it.body?.close() }
        (clock.nanoTime() - start) / 1e6
    }

    override suspend fun fetchProfiles(target: Target): ProfileTable? = withContext(Dispatchers.IO) {
        val url = endpoints.baseUrl(target) + "profiles"
        val request = Request.Builder().url(url).get().build()
        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) return@use null
            val text = response.body?.string() ?: return@use null
            val dto = json.decodeFromString(ProfilesResponseDto.serializer(), text)
            dto.toModel()
        }
    }

    override suspend fun postResult(target: Target, appId: String, deviceId: String, r: TestResult) =
        withContext(Dispatchers.IO) {
            val url = endpoints.baseUrl(target) + "results"
            val dto = r.toResultDto(appId, deviceId)
            val payload = json.encodeToString(ResultDto.serializer(), dto)
            val request = Request.Builder().url(url).post(payload.toRequestBody(jsonMedia)).build()
            client.newCall(request).execute().use { response ->
                check(response.isSuccessful) { "postResult failed: ${response.code}" }
            }
        }

    override suspend fun getResults(
        target: Target,
        appId: String,
        deviceId: String,
        limit: Int,
    ): List<TestResult> = withContext(Dispatchers.IO) {
        val url = endpoints.baseUrl(target) + "results?appId=$appId&deviceId=$deviceId&limit=$limit"
        val request = Request.Builder().url(url).get().build()
        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) return@use emptyList()
            val text = response.body?.string() ?: return@use emptyList()
            val dtos = json.decodeFromString(ListSerializer(ResultDto.serializer()), text)
            val now = clock.nowMillis()
            dtos.map { it.toTestResult(timestamp = now) }
        }
    }

    /** A request body that streams [bytes] zero-filled bytes without buffering. */
    private fun streamingBody(bytes: Long): RequestBody = object : RequestBody() {
        override fun contentType() = octetMedia
        override fun contentLength(): Long = bytes
        override fun writeTo(sink: BufferedSink) {
            val chunk = ByteArray(64 * 1024)
            var remaining = bytes
            while (remaining > 0) {
                val n = minOf(remaining, chunk.size.toLong()).toInt()
                sink.write(chunk, 0, n)
                remaining -= n
            }
        }
    }

    companion object {
        fun defaultClient(): OkHttpClient = OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }
}
