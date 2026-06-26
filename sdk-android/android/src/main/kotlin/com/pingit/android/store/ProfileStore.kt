package com.pingit.android.store

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.pingit.core.io.ProfileStore
import com.pingit.core.profiles.CacheState
import kotlinx.coroutines.flow.first

/** DataStore-backed persistence of the resolved profile-table cache. */
class DataStoreProfileStore(context: Context) : ProfileStore {

    private val store = context.applicationContext.pingItDataStore
    private val key = stringPreferencesKey("profile_cache")

    override suspend fun read(): CacheState? {
        val raw = store.data.first()[key] ?: return null
        return runCatching {
            storeJson.decodeFromString(CacheStateRecord.serializer(), raw).toModel()
        }.getOrNull()
    }

    override suspend fun write(s: CacheState) {
        val raw = storeJson.encodeToString(CacheStateRecord.serializer(), s.toRecord())
        store.edit { it[key] = raw }
    }
}
