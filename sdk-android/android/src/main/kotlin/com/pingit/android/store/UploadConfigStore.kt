package com.pingit.android.store

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.flow.first
import kotlinx.serialization.Serializable

/** Config the background [com.pingit.android.work.UploadWorker] needs. */
@Serializable
data class UploadConfig(
    val appId: String,
    val deviceId: String,
    val endpoint: String,
    val fallbackEndpoint: String? = null,
)

/** Persists the minimal config needed to upload from a background worker. */
class UploadConfigStore(context: Context) {

    private val store = context.applicationContext.pingItDataStore
    private val key = stringPreferencesKey("upload_config")

    suspend fun write(config: UploadConfig) {
        val raw = storeJson.encodeToString(UploadConfig.serializer(), config)
        store.edit { it[key] = raw }
    }

    suspend fun read(): UploadConfig? {
        val raw = store.data.first()[key] ?: return null
        return runCatching {
            storeJson.decodeFromString(UploadConfig.serializer(), raw)
        }.getOrNull()
    }
}
