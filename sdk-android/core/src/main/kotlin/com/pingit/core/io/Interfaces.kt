package com.pingit.core.io

import com.pingit.core.fallback.Target
import com.pingit.core.model.ProfileTable
import com.pingit.core.model.TestResult
import com.pingit.core.profiles.CacheState

/** Time source. Split into wall-clock millis and a monotonic nano timer. */
interface Clock {
    fun nowMillis(): Long
    fun nanoTime(): Long
}

/** Random source, abstracted for deterministic testing. */
interface Rng {
    /** Uniform value in [0.0, 1.0). */
    fun nextDouble(): Double
}

/** Timing result of an upload transfer. */
data class UploadTiming(val bytes: Long, val nanos: Long)

/**
 * Network transport used by the measurement + profile + result subsystems.
 * Implementations choose the base URL based on [Target].
 */
interface HttpClient {
    /**
     * Download [bytes] from [target], invoking [onSample] with
     * (cumulativeBytes, atNanos) periodically so callers can compute effective
     * throughput. Suspends until complete or cancelled.
     */
    suspend fun download(target: Target, bytes: Long, onSample: (Long, Long) -> Unit)

    /** Upload [bytes] to [target], returning the measured timing. */
    suspend fun upload(target: Target, bytes: Long): UploadTiming

    /** Single ping; returns round-trip time in milliseconds. */
    suspend fun ping(target: Target): Double

    /** Fetch the profile table from [target], or null if unavailable. */
    suspend fun fetchProfiles(target: Target): ProfileTable?

    /** POST a result to the server. */
    suspend fun postResult(target: Target, appId: String, deviceId: String, r: TestResult)

    /** Fetch up to [limit] historical results from the server, newest first. */
    suspend fun getResults(
        target: Target,
        appId: String,
        deviceId: String,
        limit: Int,
    ): List<TestResult>
}

/** Lightweight health probe used by fallback selection. */
interface HealthApi {
    suspend fun health(target: Target): Boolean
}

/** Network connectivity + OS data-saver status. */
interface Connectivity {
    fun isConnected(): Boolean
    fun osDataSaverEnabled(): Boolean
}

/** Supplies a stable per-install device id. */
interface DeviceIdProvider {
    fun deviceId(): String
}

/** Persistence for the resolved profile-table cache. */
interface ProfileStore {
    suspend fun read(): CacheState?
    suspend fun write(s: CacheState)
}

/** Persistence for the single most recent result. */
interface LastResultStore {
    suspend fun read(): TestResult?
    suspend fun write(r: TestResult)
    suspend fun clear()
}

/** A queued item awaiting upload. */
data class OutboxItem(
    val id: String,
    val kind: OutboxKind,
    val result: TestResult? = null,
    val crashMessage: String? = null,
    val crashStack: String? = null,
)

enum class OutboxKind { RESULT, CRASH }

/** Bounded queue of pending uploads (results + crashes). */
interface Outbox {
    suspend fun enqueueResult(r: TestResult)
    suspend fun enqueueCrash(message: String, stack: String?)
    suspend fun peekAll(): List<OutboxItem>
    suspend fun remove(id: String)
}

/** Synchronous crash persistence used from an uncaught-exception handler. */
interface CrashSink {
    fun persistCrashSync(t: Throwable, last: TestResult?)
}
