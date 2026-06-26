package com.pingit.core

import com.pingit.core.fallback.Target
import com.pingit.core.fallback.TargetSelector
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class TargetSelectorTest {

    @Test
    fun primaryHealthyUsesPrimary() {
        assertEquals(
            Target.PRIMARY,
            TargetSelector.selectTarget(primaryHealthy = true, fallbackConfigured = true, fallbackHealthy = true),
        )
        // Even if fallback is unhealthy, primary wins.
        assertEquals(
            Target.PRIMARY,
            TargetSelector.selectTarget(primaryHealthy = true, fallbackConfigured = false, fallbackHealthy = false),
        )
    }

    @Test
    fun primaryDownUsesHealthyConfiguredFallback() {
        assertEquals(
            Target.FALLBACK,
            TargetSelector.selectTarget(primaryHealthy = false, fallbackConfigured = true, fallbackHealthy = true),
        )
    }

    @Test
    fun nothingUsableReturnsNull() {
        assertNull(TargetSelector.selectTarget(primaryHealthy = false, fallbackConfigured = false, fallbackHealthy = false))
        assertNull(TargetSelector.selectTarget(primaryHealthy = false, fallbackConfigured = true, fallbackHealthy = false))
        assertNull(TargetSelector.selectTarget(primaryHealthy = false, fallbackConfigured = false, fallbackHealthy = true))
    }

    @Test
    fun offlineDecisionFollowsConnectivity() {
        assertTrue(TargetSelector.offlineDecision(connected = false, anyReachable = true))
        assertFalse(TargetSelector.offlineDecision(connected = true, anyReachable = false))
        assertFalse(TargetSelector.offlineDecision(connected = true, anyReachable = true))
    }
}
