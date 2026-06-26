package com.pingit.core.profiles

import com.pingit.core.io.Rng
import com.pingit.core.model.ProfileTable

/** Persisted cache state for the resolved profile table. */
data class CacheState(
    val table: ProfileTable,
    val fetchedAtMillis: Long,
    val nextRefreshAtMillis: Long,
)

object ProfileCache {

    /** ~24h base refresh interval. */
    private const val BASE_REFRESH_MILLIS = 24L * 60L * 60L * 1000L

    /** +/- 1 hour of jitter so installs don't all refresh simultaneously. */
    private const val JITTER_SPAN_MILLIS = 60L * 60L * 1000L

    /** Stale once we are at or past the scheduled refresh time. */
    fun isStale(state: CacheState, now: Long): Boolean = now >= state.nextRefreshAtMillis

    /**
     * Next refresh time = now + 24h +/- jitter. Deterministic for a seeded
     * [rng]: jitter = (nextDouble() - 0.5) * 2 * JITTER_SPAN.
     */
    fun computeNextRefresh(now: Long, rng: Rng): Long {
        val jitter = ((rng.nextDouble() - 0.5) * 2.0 * JITTER_SPAN_MILLIS).toLong()
        return now + BASE_REFRESH_MILLIS + jitter
    }

    /**
     * Replace the cached table when there is no current table, or the freshly
     * fetched table has a different version.
     */
    fun shouldReplace(current: ProfileTable?, fetched: ProfileTable): Boolean =
        current == null || current.version != fetched.version
}
