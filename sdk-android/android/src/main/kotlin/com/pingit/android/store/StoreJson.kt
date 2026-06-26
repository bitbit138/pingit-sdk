package com.pingit.android.store

import com.pingit.core.io.OutboxItem
import com.pingit.core.io.OutboxKind
import com.pingit.core.json.ProfilesResponseDto
import com.pingit.core.json.toDto
import com.pingit.core.json.toModel
import com.pingit.core.model.TestResult
import com.pingit.core.profiles.CacheState
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/** JSON used for all DataStore-persisted PingIt values. */
internal val storeJson = Json { ignoreUnknownKeys = true; encodeDefaults = true }

/** Persistable form of a [TestResult]. */
@Serializable
internal data class TestResultRecord(
    val downloadMbps: Double,
    val uploadMbps: Double,
    val latencyMs: Double,
    val jitterMs: Double,
    val packetLossPct: Double,
    val score: Int,
    val label: String,
    val timestamp: Long,
)

internal fun TestResult.toRecord() = TestResultRecord(
    downloadMbps, uploadMbps, latencyMs, jitterMs, packetLossPct, score, label, timestamp,
)

internal fun TestResultRecord.toModel() = TestResult(
    downloadMbps, uploadMbps, latencyMs, jitterMs, packetLossPct, score, label, timestamp,
)

/** Persistable form of a [CacheState] (reusing core's profiles DTO). */
@Serializable
internal data class CacheStateRecord(
    val table: ProfilesResponseDto,
    val fetchedAtMillis: Long,
    val nextRefreshAtMillis: Long,
)

internal fun CacheState.toRecord() = CacheStateRecord(
    table = table.toDto(),
    fetchedAtMillis = fetchedAtMillis,
    nextRefreshAtMillis = nextRefreshAtMillis,
)

internal fun CacheStateRecord.toModel(): CacheState = CacheState(
    table = table.toModel(),
    fetchedAtMillis = fetchedAtMillis,
    nextRefreshAtMillis = nextRefreshAtMillis,
)

/** Persistable form of an [OutboxItem]. */
@Serializable
internal data class OutboxItemRecord(
    val id: String,
    val kind: String,
    val result: TestResultRecord? = null,
    val crashMessage: String? = null,
    val crashStack: String? = null,
)

@Serializable
internal data class OutboxRecord(val items: List<OutboxItemRecord> = emptyList())

internal fun OutboxItem.toRecord() = OutboxItemRecord(
    id = id,
    kind = kind.name,
    result = result?.toRecord(),
    crashMessage = crashMessage,
    crashStack = crashStack,
)

internal fun OutboxItemRecord.toModel() = OutboxItem(
    id = id,
    kind = OutboxKind.valueOf(kind),
    result = result?.toModel(),
    crashMessage = crashMessage,
    crashStack = crashStack,
)
