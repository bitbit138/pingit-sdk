package com.pingit.android.store

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.pingit.core.io.DeviceIdProvider
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import java.util.UUID

/**
 * Persists a stable per-install UUID in DataStore so it survives process and
 * device restarts. The first read generates and stores a new id.
 */
class DeviceIdStore(context: Context) : DeviceIdProvider {

    private val store = context.applicationContext.pingItDataStore
    private val key = stringPreferencesKey("device_id")

    @Volatile
    private var cached: String? = null

    override fun deviceId(): String {
        cached?.let { return it }
        // DataStore is async; the device id is required synchronously here, so
        // block once on first access then cache for the lifetime of the process.
        return runBlocking {
            val existing = store.data.first()[key]
            val id = existing ?: UUID.randomUUID().toString().also { generated ->
                store.edit { it[key] = generated }
            }
            cached = id
            id
        }
    }
}
