package com.pingit.core.json

import kotlinx.serialization.Serializable

/** Wire form of a [com.pingit.core.model.Range]. Both bounds optional. */
@Serializable
data class RangeDto(
    val min: Double? = null,
    val max: Double? = null,
)

/**
 * Wire form of one profile. `requires` is an object keyed by metric name:
 * "downloadMbps" | "uploadMbps" | "latencyMs" | "jitterMs" | "packetLossPct".
 */
@Serializable
data class ProfileDto(
    val id: String,
    val requires: Map<String, RangeDto> = emptyMap(),
)

/** Wire form of the whole profile table (matches profiles.json). */
@Serializable
data class ProfilesResponseDto(
    val version: Int,
    val profiles: List<ProfileDto> = emptyList(),
)

/** Request body for POST /results. */
@Serializable
data class ResultDto(
    val appId: String,
    val deviceId: String,
    val downloadMbps: Double,
    val uploadMbps: Double,
    val latencyMs: Double,
    val jitterMs: Double,
    val packetLossPct: Double,
    val score: Int,
)
