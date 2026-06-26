package com.pingit.android.net

import com.pingit.core.fallback.Target
import com.pingit.core.io.HealthApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit

/** Probes the `/health` endpoint of a [Target]. */
class HealthChecker(
    private val endpoints: Endpoints,
    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(3, TimeUnit.SECONDS)
        .readTimeout(3, TimeUnit.SECONDS)
        .build(),
) : HealthApi {

    override suspend fun health(target: Target): Boolean = withContext(Dispatchers.IO) {
        val url = endpoints.baseUrl(target) + "health"
        val request = Request.Builder().url(url).get().build()
        runCatching {
            client.newCall(request).execute().use { it.isSuccessful }
        }.getOrDefault(false)
    }
}
