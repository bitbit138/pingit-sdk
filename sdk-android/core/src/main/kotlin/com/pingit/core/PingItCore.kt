package com.pingit.core

import com.pingit.core.eval.ReadinessService
import com.pingit.core.fallback.Target
import com.pingit.core.history.HistoryPolicy
import com.pingit.core.io.Clock
import com.pingit.core.io.Connectivity
import com.pingit.core.io.DeviceIdProvider
import com.pingit.core.io.HttpClient
import com.pingit.core.io.LastResultStore
import com.pingit.core.io.Outbox
import com.pingit.core.measure.MeasurementService
import com.pingit.core.model.Config
import com.pingit.core.model.Profile
import com.pingit.core.model.ProfileTable
import com.pingit.core.model.ReadinessResult
import com.pingit.core.model.TestResult
import com.pingit.core.profiles.ProfileResolver
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancelChildren
import kotlinx.coroutines.withContext

/**
 * Pure-Kotlin orchestrator for the SDK. All platform concerns are injected via
 * the io interfaces, so this class is fully unit-testable. The Android facade
 * (`PingIt`) constructs the platform adapters and hands them here.
 */
class PingItCore(
    private val appId: String,
    private val deviceIdProvider: DeviceIdProvider,
    private val config: Config,
    private val http: HttpClient,
    private val connectivity: Connectivity,
    private val clock: Clock,
    private val lastResultStore: LastResultStore,
    private val outbox: Outbox,
    private val profileResolver: ProfileResolver,
    private val measurement: MeasurementService,
    private val readiness: ReadinessService,
) {

    /** Tracks the in-flight measurement so [cancel] can abort it. */
    private val supervisor = SupervisorJob()

    private val deviceId: String get() = deviceIdProvider.deviceId()

    /** Run a measurement, persist + enqueue per history policy, return it. */
    suspend fun runTest(): TestResult = runCancellable {
        val result = measurement.runTest()
        persist(result)
        result
    }

    /** Single latency probe. */
    suspend fun ping(): Double = runCancellable { measurement.ping() }

    /**
     * Measure and evaluate readiness for [profile]. The measured result (if any)
     * is persisted + enqueued per history policy.
     */
    suspend fun isReadyFor(profile: Profile): ReadinessResult = runCancellable {
        val table = profileResolver.resolve(force = false)
        val readinessResult = readiness.isReadyFor(profile, table)
        readinessResult.measured?.let { persist(it) }
        readinessResult
    }

    /**
     * Return up to [limit] historical results, newest-first, per history mode.
     * For SERVER_HISTORY it merges the server's stored results with the local one.
     */
    suspend fun getHistory(limit: Int): List<TestResult> {
        val lastLocal = lastResultStore.read()
        val serverResults = if (HistoryPolicy.shouldEnqueueServer(config.historyMode) &&
            connectivity.isConnected()
        ) {
            runCatching { http.getResults(currentTarget(), appId, deviceId, limit) }
                .getOrDefault(emptyList())
        } else {
            emptyList()
        }
        return HistoryPolicy.historyFor(config.historyMode, lastLocal, serverResults, limit)
    }

    /** Force a profile-table refresh. */
    suspend fun refreshProfiles(): ProfileTable = profileResolver.resolve(force = true)

    /** Cancel any in-flight measurement work. */
    fun cancel() {
        supervisor.cancelChildren()
    }

    // --- internals ---

    private suspend fun persist(result: TestResult) {
        if (HistoryPolicy.shouldPersistLastLocal(config.historyMode)) {
            lastResultStore.write(result)
        }
        if (HistoryPolicy.shouldEnqueueServer(config.historyMode)) {
            outbox.enqueueResult(result)
        }
    }

    private fun currentTarget(): Target = Target.PRIMARY

    /**
     * Run [block] under a fresh [Job] parented to [supervisor], so a call to
     * [cancel] (which cancels the supervisor's children) aborts the work, while
     * the result/exception still propagates to the caller. The caller's
     * dispatcher is preserved.
     */
    private suspend fun <T> runCancellable(block: suspend () -> T): T {
        val child = Job(supervisor)
        return try {
            withContext(child) { block() }
        } finally {
            child.complete()
        }
    }
}
