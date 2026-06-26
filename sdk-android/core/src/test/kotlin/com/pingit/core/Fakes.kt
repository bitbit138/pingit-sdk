package com.pingit.core

import com.pingit.core.fallback.Target
import com.pingit.core.io.Clock
import com.pingit.core.io.Connectivity
import com.pingit.core.io.CrashSink
import com.pingit.core.io.DeviceIdProvider
import com.pingit.core.io.HealthApi
import com.pingit.core.io.HttpClient
import com.pingit.core.io.LastResultStore
import com.pingit.core.io.Outbox
import com.pingit.core.io.OutboxItem
import com.pingit.core.io.OutboxKind
import com.pingit.core.io.ProfileStore
import com.pingit.core.io.Rng
import com.pingit.core.io.UploadTiming
import com.pingit.core.model.ProfileTable
import com.pingit.core.model.TestResult
import com.pingit.core.profiles.CacheState
import java.util.UUID
import java.util.concurrent.atomic.AtomicLong

/** Manually advanceable clock. */
class FakeClock(
    var millis: Long = 0L,
    private val nanos: AtomicLong = AtomicLong(0L),
) : Clock {
    override fun nowMillis(): Long = millis
    override fun nanoTime(): Long = nanos.get()
    fun advanceNanos(by: Long) { nanos.addAndGet(by) }
    fun setNanos(value: Long) { nanos.set(value) }
}

/** Deterministic RNG that cycles through provided values. */
class FakeRng(private val values: List<Double>) : Rng {
    constructor(vararg v: Double) : this(v.toList())
    private var i = 0
    override fun nextDouble(): Double {
        if (values.isEmpty()) return 0.0
        val v = values[i % values.size]
        i++
        return v
    }
}

class FakeConnectivity(
    var connected: Boolean = true,
    var dataSaver: Boolean = false,
) : Connectivity {
    override fun isConnected(): Boolean = connected
    override fun osDataSaverEnabled(): Boolean = dataSaver
}

class FakeDeviceIdProvider(private val id: String = "device-123") : DeviceIdProvider {
    override fun deviceId(): String = id
}

/** Records the last written result and what was cleared. */
class FakeLastResultStore(var current: TestResult? = null) : LastResultStore {
    val writes = mutableListOf<TestResult>()
    var clears = 0
    override suspend fun read(): TestResult? = current
    override suspend fun write(r: TestResult) { current = r; writes.add(r) }
    override suspend fun clear() { current = null; clears++ }
}

class FakeProfileStore(var state: CacheState? = null) : ProfileStore {
    val writes = mutableListOf<CacheState>()
    override suspend fun read(): CacheState? = state
    override suspend fun write(s: CacheState) { state = s; writes.add(s) }
}

/** Bounded in-memory outbox. */
class FakeOutbox(private val capacity: Int = 100) : Outbox {
    val items = mutableListOf<OutboxItem>()
    override suspend fun enqueueResult(r: TestResult) {
        trim()
        items.add(OutboxItem(UUID.randomUUID().toString(), OutboxKind.RESULT, result = r))
    }
    override suspend fun enqueueCrash(message: String, stack: String?) {
        trim()
        items.add(OutboxItem(UUID.randomUUID().toString(), OutboxKind.CRASH, crashMessage = message, crashStack = stack))
    }
    override suspend fun peekAll(): List<OutboxItem> = items.toList()
    override suspend fun remove(id: String) { items.removeAll { it.id == id } }
    private fun trim() { while (items.size >= capacity) items.removeAt(0) }
}

class FakeCrashSink : CrashSink {
    val persisted = mutableListOf<Pair<Throwable, TestResult?>>()
    override fun persistCrashSync(t: Throwable, last: TestResult?) { persisted.add(t to last) }
}

class FakeHealthApi(private val healthy: Map<Target, Boolean> = emptyMap()) : HealthApi {
    override suspend fun health(target: Target): Boolean = healthy[target] ?: true
}

/**
 * Configurable fake HttpClient. Defaults to a healthy, fast link. Throwing
 * fetchProfiles can be simulated by setting [profilesError].
 */
open class FakeHttpClient(
    var downloadMbps: Double = 50.0,
    var uploadMbps: Double = 20.0,
    var pingMs: Double = 25.0,
    var profiles: ProfileTable? = null,
    var profilesError: Boolean = false,
    var serverHistory: List<TestResult> = emptyList(),
) : HttpClient {

    var fetchProfilesCalls = 0
    val postedResults = mutableListOf<TestResult>()

    override suspend fun download(target: Target, bytes: Long, onSample: (Long, Long) -> Unit) {
        // Emit a couple of cumulative samples consistent with downloadMbps.
        // bytes over duration d: mbps = bytes*8/(d/1e9)/1e6  => d = bytes*8/mbps/1e6*1e9
        val nanos = if (downloadMbps > 0.0) (bytes * 8.0 / downloadMbps / 1e6 * 1e9).toLong() else 1_000_000L
        onSample(0L, 0L)
        onSample(bytes / 2, nanos / 2)
        onSample(bytes, nanos)
    }

    override suspend fun upload(target: Target, bytes: Long): UploadTiming {
        val nanos = if (uploadMbps > 0.0) (bytes * 8.0 / uploadMbps / 1e6 * 1e9).toLong() else 1_000_000L
        return UploadTiming(bytes = bytes, nanos = nanos)
    }

    override suspend fun ping(target: Target): Double = pingMs

    override suspend fun fetchProfiles(target: Target): ProfileTable? {
        fetchProfilesCalls++
        if (profilesError) throw RuntimeException("server down")
        return profiles
    }

    override suspend fun postResult(target: Target, appId: String, deviceId: String, r: TestResult) {
        postedResults.add(r)
    }

    override suspend fun getResults(target: Target, appId: String, deviceId: String, limit: Int): List<TestResult> =
        serverHistory.take(limit)
}
