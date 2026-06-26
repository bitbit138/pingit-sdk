package com.pingit.core.model

/**
 * Usage profiles the SDK can evaluate readiness for. The [name] of each enum
 * constant matches the `id` strings used in profiles.json / the server table.
 */
enum class Profile {
    MESSAGING,
    WEB_BROWSING,
    MUSIC_STREAMING,
    VOICE_CALL,
    VIDEO_CALL,
    HD_STREAMING,
    UHD_4K_STREAMING,
    CLOUD_GAMING,
    LIVE_BROADCAST,
    LARGE_UPLOAD,
}

/**
 * An inclusive numeric requirement. A null bound means "no constraint" on that
 * side. For "min" metrics (throughput) we check measured >= min; for "max"
 * metrics (latency/jitter/loss) we check measured <= max.
 */
data class Range(
    val min: Double? = null,
    val max: Double? = null,
)

/**
 * The set of constraints a profile requires. Any null [Range] is skipped during
 * evaluation.
 */
data class Requires(
    val downloadMbps: Range? = null,
    val uploadMbps: Range? = null,
    val latencyMs: Range? = null,
    val jitterMs: Range? = null,
    val packetLossPct: Range? = null,
)

/** A single profile entry: which profile and what it requires. */
data class ProfileSpec(
    val id: Profile,
    val requires: Requires,
)

/** The full versioned profile table. */
data class ProfileTable(
    val version: Int,
    val profiles: List<ProfileSpec>,
) {
    /** Look up the requirements for [profile], or null if not present. */
    fun requiresFor(profile: Profile): Requires? =
        profiles.firstOrNull { it.id == profile }?.requires
}

/** How history is retained. */
enum class HistoryMode {
    /** No persistence at all. */
    NONE,

    /** Persist only the most recent result locally. */
    LAST_LOCAL,

    /** Persist locally and additionally enqueue results for server upload. */
    SERVER_HISTORY,
}

/** SDK configuration. */
data class Config(
    val historyMode: HistoryMode = HistoryMode.LAST_LOCAL,
    val dataSaver: Boolean = false,
    val endpoint: String,
    val fallbackEndpoint: String? = null,
)

/** The result of a single measurement run. */
data class TestResult(
    val downloadMbps: Double,
    val uploadMbps: Double,
    val latencyMs: Double,
    val jitterMs: Double,
    val packetLossPct: Double,
    val score: Int,
    val label: String,
    val timestamp: Long,
)

/** The outcome of a readiness check for a specific profile. */
data class ReadinessResult(
    val profile: Profile,
    val passed: Boolean,
    val reason: String,
    val measured: TestResult?,
)
