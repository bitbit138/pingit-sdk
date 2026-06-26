package com.pingit.core.json

import com.pingit.core.model.Profile
import com.pingit.core.model.ProfileSpec
import com.pingit.core.model.ProfileTable
import com.pingit.core.model.Range
import com.pingit.core.model.Requires
import com.pingit.core.model.TestResult
import com.pingit.core.score.Score

/** Metric-key strings used in the `requires` object of a [ProfileDto]. */
object MetricKeys {
    const val DOWNLOAD = "downloadMbps"
    const val UPLOAD = "uploadMbps"
    const val LATENCY = "latencyMs"
    const val JITTER = "jitterMs"
    const val LOSS = "packetLossPct"
}

fun RangeDto.toModel(): Range = Range(min = min, max = max)

fun Range.toDto(): RangeDto = RangeDto(min = min, max = max)

/** Map the metric-keyed map into the strongly typed [Requires]. */
fun Map<String, RangeDto>.toRequires(): Requires = Requires(
    downloadMbps = this[MetricKeys.DOWNLOAD]?.toModel(),
    uploadMbps = this[MetricKeys.UPLOAD]?.toModel(),
    latencyMs = this[MetricKeys.LATENCY]?.toModel(),
    jitterMs = this[MetricKeys.JITTER]?.toModel(),
    packetLossPct = this[MetricKeys.LOSS]?.toModel(),
)

/** Reverse mapping: only include keys whose [Range] is present. */
fun Requires.toMap(): Map<String, RangeDto> = buildMap {
    downloadMbps?.let { put(MetricKeys.DOWNLOAD, it.toDto()) }
    uploadMbps?.let { put(MetricKeys.UPLOAD, it.toDto()) }
    latencyMs?.let { put(MetricKeys.LATENCY, it.toDto()) }
    jitterMs?.let { put(MetricKeys.JITTER, it.toDto()) }
    packetLossPct?.let { put(MetricKeys.LOSS, it.toDto()) }
}

/**
 * Convert a [ProfileDto] to a [ProfileSpec], or null if the id is not a known
 * [Profile] (forward compatibility: unknown profiles are ignored).
 */
fun ProfileDto.toModelOrNull(): ProfileSpec? {
    val profile = runCatching { Profile.valueOf(id) }.getOrNull() ?: return null
    return ProfileSpec(id = profile, requires = requires.toRequires())
}

fun ProfileSpec.toDto(): ProfileDto = ProfileDto(id = id.name, requires = requires.toMap())

/** Convert the response DTO into the domain [ProfileTable], dropping unknowns. */
fun ProfilesResponseDto.toModel(): ProfileTable = ProfileTable(
    version = version,
    profiles = profiles.mapNotNull { it.toModelOrNull() },
)

fun ProfileTable.toDto(): ProfilesResponseDto = ProfilesResponseDto(
    version = version,
    profiles = profiles.map { it.toDto() },
)

/** Build a POST /results body from a [TestResult]. */
fun TestResult.toResultDto(appId: String, deviceId: String): ResultDto = ResultDto(
    appId = appId,
    deviceId = deviceId,
    downloadMbps = downloadMbps,
    uploadMbps = uploadMbps,
    latencyMs = latencyMs,
    jitterMs = jitterMs,
    packetLossPct = packetLossPct,
    score = score,
)

/**
 * Reconstruct a [TestResult] from a server result DTO. The server stores the
 * score only, so label is recomputed and timestamp is supplied by the caller.
 */
fun ResultDto.toTestResult(timestamp: Long): TestResult = TestResult(
    downloadMbps = downloadMbps,
    uploadMbps = uploadMbps,
    latencyMs = latencyMs,
    jitterMs = jitterMs,
    packetLossPct = packetLossPct,
    score = score,
    label = Score.label(score),
    timestamp = timestamp,
)
