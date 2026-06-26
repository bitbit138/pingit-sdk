package com.pingit

import android.content.Context
import com.pingit.android.crash.CrashHandler
import com.pingit.android.crash.FileCrashSink
import com.pingit.android.lifecycle.FlushObserver
import com.pingit.android.net.AndroidConnectivity
import com.pingit.android.net.Endpoints
import com.pingit.android.net.HealthChecker
import com.pingit.android.net.OkHttpHttpClient
import com.pingit.android.store.DataStoreLastResultStore
import com.pingit.android.store.DataStoreOutbox
import com.pingit.android.store.DataStoreProfileStore
import com.pingit.android.store.DeviceIdStore
import com.pingit.android.store.UploadConfig
import com.pingit.android.store.UploadConfigStore
import com.pingit.core.PingItCore
import com.pingit.core.eval.ReadinessService
import com.pingit.core.fallback.Target
import com.pingit.core.fallback.TargetSelector
import com.pingit.core.io.Clock
import com.pingit.core.io.Rng
import com.pingit.core.measure.MeasurementService
import com.pingit.core.model.Config
import com.pingit.core.model.Profile
import com.pingit.core.model.ProfileTable
import com.pingit.core.model.ReadinessResult
import com.pingit.core.model.TestResult
import com.pingit.core.profiles.ProfileResolver
import kotlinx.coroutines.runBlocking
import java.util.concurrent.atomic.AtomicReference

/**
 * Public Android entry point.
 *
 * Most apps do not need to call [init] at all. The SDK initializes itself on app
 * startup from the values declared in the app manifest (see PingItInitializer),
 * after which the ready-to-use client is available from [getInstance].
 *
 * Call [init] directly only when you want to configure the SDK in code or
 * override the manifest values at runtime.
 */
object PingIt {

    @Volatile
    private var defaultClient: PingItClient? = null

    /**
     * Returns the client created during auto-initialization (or by a prior call
     * to [init]). Throws if the SDK has not been initialized yet, with guidance
     * on how to configure it.
     */
    fun getInstance(): PingItClient =
        defaultClient ?: throw IllegalStateException(
            "PingIt is not initialized. Add the PingIt meta-data to your " +
                "AndroidManifest.xml (com.pingit.APP_ID and com.pingit.ENDPOINT) " +
                "for automatic startup, or call PingIt.init(appId, config, context).",
        )

    /** True once the SDK has been initialized (via auto-init or [init]). */
    fun isInitialized(): Boolean = defaultClient != null

    /**
     * Initialize the SDK. Wires the platform adapters to [PingItCore], installs
     * the crash handler and the background-flush lifecycle observer, and returns
     * a ready-to-use [PingItClient]. The returned client also becomes the
     * instance served by [getInstance].
     */
    fun init(appId: String, config: Config, context: Context): PingItClient {
        val app = context.applicationContext

        val endpoints = Endpoints(config.endpoint, config.fallbackEndpoint)
        val clock = object : Clock {
            override fun nowMillis(): Long = System.currentTimeMillis()
            override fun nanoTime(): Long = System.nanoTime()
        }
        val rng = object : Rng {
            override fun nextDouble(): Double = Math.random()
        }

        val http = OkHttpHttpClient(endpoints, clock)
        val health = HealthChecker(endpoints)
        val connectivity = AndroidConnectivity(app)
        val deviceIdProvider = DeviceIdStore(app)
        val lastResultStore = DataStoreLastResultStore(app)
        val outbox = DataStoreOutbox(app)
        val profileStore = DataStoreProfileStore(app)

        // Effective data-saver: explicit config OR OS data-saver enabled.
        val dataSaver = config.dataSaver || connectivity.osDataSaverEnabled()

        // Health-aware target selection, recomputed per measurement.
        val targetProvider: suspend () -> Target = {
            val primaryHealthy = health.health(Target.PRIMARY)
            val fallbackConfigured = config.fallbackEndpoint != null
            val fallbackHealthy = if (fallbackConfigured) health.health(Target.FALLBACK) else false
            TargetSelector.selectTarget(primaryHealthy, fallbackConfigured, fallbackHealthy)
                ?: Target.PRIMARY
        }

        val measurement = MeasurementService(http, clock, dataSaver, targetProvider)
        val readiness = ReadinessService(connectivity, measurement)
        val resolver = ProfileResolver(http, profileStore, clock, rng, Target.PRIMARY)

        val deviceId = deviceIdProvider.deviceId()

        val core = PingItCore(
            appId = appId,
            deviceIdProvider = deviceIdProvider,
            config = config,
            http = http,
            connectivity = connectivity,
            clock = clock,
            lastResultStore = lastResultStore,
            outbox = outbox,
            profileResolver = resolver,
            measurement = measurement,
            readiness = readiness,
        )

        // Persist the minimal config the background worker needs.
        runBlocking {
            UploadConfigStore(app).write(
                UploadConfig(
                    appId = appId,
                    deviceId = deviceId,
                    endpoint = config.endpoint,
                    fallbackEndpoint = config.fallbackEndpoint,
                ),
            )
        }

        val lastResultRef = AtomicReference<TestResult?>(null)
        // Best-effort warm-up of the last-result cache for the crash handler.
        runCatching { runBlocking { lastResultRef.set(lastResultStore.read()) } }

        // Install crash handler (synchronous, file-backed) + background flush.
        CrashHandler.install(FileCrashSink(app)) { lastResultRef.get() }
        FlushObserver(app).register()

        val client = PingItClient(core, lastResultRef)
        defaultClient = client
        return client
    }
}

/**
 * Thin coroutine-friendly wrapper around [PingItCore]. All measurement methods
 * are suspend functions; [cancel] aborts any in-flight work.
 */
class PingItClient internal constructor(
    private val core: PingItCore,
    private val lastResultRef: AtomicReference<TestResult?>,
) {

    suspend fun isReadyFor(profile: Profile): ReadinessResult {
        val result = core.isReadyFor(profile)
        result.measured?.let { lastResultRef.set(it) }
        return result
    }

    suspend fun runTest(): TestResult {
        val result = core.runTest()
        lastResultRef.set(result)
        return result
    }

    suspend fun ping(): Double = core.ping()

    suspend fun getHistory(limit: Int): List<TestResult> = core.getHistory(limit)

    suspend fun refreshProfiles(): ProfileTable = core.refreshProfiles()

    fun cancel() = core.cancel()
}
