package com.pingit.core.profiles

import com.pingit.core.fallback.Target
import com.pingit.core.io.Clock
import com.pingit.core.io.HttpClient
import com.pingit.core.io.ProfileStore
import com.pingit.core.io.Rng
import com.pingit.core.model.ProfileTable

/**
 * Resolves the active [ProfileTable] using a layered strategy:
 *
 *  1. If [force] or the cached state is stale, attempt a network fetch. If it
 *     succeeds and the version differs (or there was no cache), persist + use it.
 *     If the version is unchanged we keep the cached table but still bump the
 *     next-refresh time.
 *  2. Otherwise fall back to the cached table.
 *  3. If there is no usable cache (e.g. server down on first run), fall back to
 *     the bundled table.
 */
class ProfileResolver(
    private val http: HttpClient,
    private val store: ProfileStore,
    private val clock: Clock,
    private val rng: Rng,
    private val target: Target = Target.PRIMARY,
) {

    suspend fun resolve(force: Boolean): ProfileTable {
        val cached = store.read()
        val now = clock.nowMillis()

        val shouldFetch = force || cached == null || ProfileCache.isStale(cached, now)
        if (shouldFetch) {
            val fetched = runCatching { http.fetchProfiles(target) }.getOrNull()
            if (fetched != null) {
                val current = cached?.table
                val table = if (ProfileCache.shouldReplace(current, fetched)) fetched else current!!
                val next = ProfileCache.computeNextRefresh(now, rng)
                store.write(CacheState(table = table, fetchedAtMillis = now, nextRefreshAtMillis = next))
                return table
            }
        }

        // Fetch not needed or failed: use the cache if present, else bundled.
        cached?.let { return it.table }
        return BundledProfiles.load()
    }
}
