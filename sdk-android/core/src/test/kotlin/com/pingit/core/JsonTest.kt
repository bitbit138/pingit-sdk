package com.pingit.core

import com.pingit.core.json.ProfilesResponseDto
import com.pingit.core.json.RangeDto
import com.pingit.core.json.ResultDto
import com.pingit.core.json.toDto
import com.pingit.core.json.toModel
import com.pingit.core.json.toResultDto
import com.pingit.core.json.toTestResult
import com.pingit.core.model.Profile
import com.pingit.core.model.TestResult
import kotlinx.serialization.json.Json
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class JsonTest {

    private val json = Json { ignoreUnknownKeys = true }

    @Test
    fun parsesProfilesJsonShape() {
        val text = """
            {
              "version": 2,
              "profiles": [
                { "id": "VIDEO_CALL", "requires": { "downloadMbps": { "min": 1.5 }, "latencyMs": { "max": 200 } } }
              ]
            }
        """.trimIndent()
        val dto = json.decodeFromString(ProfilesResponseDto.serializer(), text)
        assertEquals(2, dto.version)
        assertEquals("VIDEO_CALL", dto.profiles.first().id)
        assertEquals(1.5, dto.profiles.first().requires["downloadMbps"]?.min)
        assertEquals(200.0, dto.profiles.first().requires["latencyMs"]?.max)
    }

    @Test
    fun unknownProfileIdsAreDropped() {
        val text = """
            { "version": 1, "profiles": [
                { "id": "VIDEO_CALL", "requires": {} },
                { "id": "FUTURE_PROFILE", "requires": {} }
            ] }
        """.trimIndent()
        val dto = json.decodeFromString(ProfilesResponseDto.serializer(), text)
        val table = dto.toModel()
        assertEquals(1, table.profiles.size)
        assertEquals(Profile.VIDEO_CALL, table.profiles.first().id)
    }

    @Test
    fun profileTableRoundTrips() {
        val table = ProfilesResponseDto(
            version = 5,
            profiles = listOf(
                com.pingit.core.json.ProfileDto(
                    id = "VOICE_CALL",
                    requires = mapOf(
                        "downloadMbps" to RangeDto(min = 0.1),
                        "latencyMs" to RangeDto(max = 300.0),
                    ),
                ),
            ),
        ).toModel()

        val backToDto = table.toDto()
        val encoded = json.encodeToString(ProfilesResponseDto.serializer(), backToDto)
        val decoded = json.decodeFromString(ProfilesResponseDto.serializer(), encoded).toModel()

        assertEquals(table.version, decoded.version)
        assertEquals(table.profiles.size, decoded.profiles.size)
        assertEquals(
            table.requiresFor(Profile.VOICE_CALL),
            decoded.requiresFor(Profile.VOICE_CALL),
        )
    }

    @Test
    fun resultDtoFieldNamesMatchServerContract() {
        val r = TestResult(
            downloadMbps = 12.5,
            uploadMbps = 3.0,
            latencyMs = 40.0,
            jitterMs = 5.0,
            packetLossPct = 0.5,
            score = 77,
            label = "Good",
            timestamp = 1000L,
        )
        val dto = r.toResultDto(appId = "app-1", deviceId = "dev-1")
        val encoded = json.encodeToString(ResultDto.serializer(), dto)
        for (field in listOf(
            "appId", "deviceId", "downloadMbps", "uploadMbps",
            "latencyMs", "jitterMs", "packetLossPct", "score",
        )) {
            assertTrue(encoded.contains("\"$field\""), "missing field $field in $encoded")
        }
    }

    @Test
    fun resultDtoRoundTripsBackToTestResult() {
        val original = TestResult(
            downloadMbps = 12.5,
            uploadMbps = 3.0,
            latencyMs = 40.0,
            jitterMs = 5.0,
            packetLossPct = 0.5,
            score = 77,
            label = "Good",
            timestamp = 1000L,
        )
        val dto = original.toResultDto("app-1", "dev-1")
        val encoded = json.encodeToString(ResultDto.serializer(), dto)
        val decoded = json.decodeFromString(ResultDto.serializer(), encoded)
        val reconstructed = decoded.toTestResult(timestamp = 2000L)

        assertEquals(original.downloadMbps, reconstructed.downloadMbps)
        assertEquals(original.uploadMbps, reconstructed.uploadMbps)
        assertEquals(original.latencyMs, reconstructed.latencyMs)
        assertEquals(original.jitterMs, reconstructed.jitterMs)
        assertEquals(original.packetLossPct, reconstructed.packetLossPct)
        assertEquals(original.score, reconstructed.score)
        assertEquals("Good", reconstructed.label) // recomputed from score
        assertEquals(2000L, reconstructed.timestamp)
    }
}
