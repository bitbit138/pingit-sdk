package com.pingit.core.profiles

import com.pingit.core.json.ProfilesResponseDto
import com.pingit.core.json.toModel
import com.pingit.core.model.ProfileTable
import kotlinx.serialization.json.Json

/** Loads the profile table bundled in the jar at /profiles.json. */
object BundledProfiles {

    private val json = Json { ignoreUnknownKeys = true }

    /** Parse the classpath resource into a [ProfileTable]. */
    fun load(): ProfileTable {
        val stream = BundledProfiles::class.java.getResourceAsStream("/profiles.json")
            ?: error("Bundled profiles.json not found on classpath")
        val text = stream.bufferedReader(Charsets.UTF_8).use { it.readText() }
        val dto = json.decodeFromString(ProfilesResponseDto.serializer(), text)
        return dto.toModel()
    }
}
