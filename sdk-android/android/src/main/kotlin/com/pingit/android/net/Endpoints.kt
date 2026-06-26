package com.pingit.android.net

import com.pingit.core.fallback.Target

/** Resolves a [Target] to its configured base URL. */
class Endpoints(
    private val primary: String,
    private val fallback: String?,
) {
    /** Base URL for [target], with a guaranteed trailing slash. */
    fun baseUrl(target: Target): String {
        val raw = when (target) {
            Target.PRIMARY -> primary
            Target.FALLBACK -> fallback ?: primary
        }
        return if (raw.endsWith("/")) raw else "$raw/"
    }
}
