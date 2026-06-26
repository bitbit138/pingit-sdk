package com.pingit.core

import com.pingit.core.model.Profile
import com.pingit.core.model.Range
import com.pingit.core.profiles.BundledProfiles
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class BundledProfilesTest {

    @Test
    fun parsesBundledTable() {
        val table = BundledProfiles.load()
        assertEquals(1, table.version)
    }

    @Test
    fun containsAllTenProfiles() {
        val table = BundledProfiles.load()
        assertEquals(10, table.profiles.size)
        val ids = table.profiles.map { it.id }.toSet()
        assertEquals(Profile.values().toSet(), ids)
    }

    @Test
    fun videoCallRequirementsMatchJson() {
        val table = BundledProfiles.load()
        val requires = table.requiresFor(Profile.VIDEO_CALL)
        assertNotNull(requires)
        assertEquals(1.5, requires.downloadMbps?.min)
        assertEquals(1.0, requires.uploadMbps?.min)
        assertEquals(200.0, requires.latencyMs?.max)
        assertEquals(40.0, requires.jitterMs?.max)
        assertEquals(3.0, requires.packetLossPct?.max)
    }

    @Test
    fun absentMetricsAreNull() {
        val table = BundledProfiles.load()
        val messaging = table.requiresFor(Profile.MESSAGING)
        assertNotNull(messaging)
        // MESSAGING has no upload or jitter requirement in the JSON.
        assertTrue(messaging.uploadMbps == null)
        assertTrue(messaging.jitterMs == null)
        assertEquals(Range(min = 0.1), messaging.downloadMbps)
    }
}
