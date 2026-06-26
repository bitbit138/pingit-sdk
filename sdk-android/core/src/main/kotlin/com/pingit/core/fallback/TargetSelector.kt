package com.pingit.core.fallback

/** Which endpoint a network operation should hit. */
enum class Target { PRIMARY, FALLBACK }

object TargetSelector {

    /**
     * Choose the target to use given health signals.
     *  - primary healthy        -> PRIMARY
     *  - primary down, fallback configured + healthy -> FALLBACK
     *  - otherwise               -> null (nothing usable)
     */
    fun selectTarget(
        primaryHealthy: Boolean,
        fallbackConfigured: Boolean,
        fallbackHealthy: Boolean,
    ): Target? = when {
        primaryHealthy -> Target.PRIMARY
        fallbackConfigured && fallbackHealthy -> Target.FALLBACK
        else -> null
    }

    /**
     * Whether the SDK should treat the situation as "offline". We are offline
     * whenever there is no device connectivity at all. [anyReachable] is the
     * supplementary signal of whether any endpoint responded.
     */
    fun offlineDecision(connected: Boolean, anyReachable: Boolean): Boolean = !connected
}
