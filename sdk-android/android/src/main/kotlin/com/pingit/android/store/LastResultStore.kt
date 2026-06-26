package com.pingit.android.store

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.pingit.core.io.LastResultStore
import com.pingit.core.model.TestResult
import kotlinx.coroutines.flow.first

/** DataStore-backed persistence of the single most recent result. */
class DataStoreLastResultStore(context: Context) : LastResultStore {

    private val store = context.applicationContext.pingItDataStore
    private val key = stringPreferencesKey("last_result")

    override suspend fun read(): TestResult? {
        val raw = store.data.first()[key] ?: return null
        return runCatching {
            storeJson.decodeFromString(TestResultRecord.serializer(), raw).toModel()
        }.getOrNull()
    }

    override suspend fun write(r: TestResult) {
        val raw = storeJson.encodeToString(TestResultRecord.serializer(), r.toRecord())
        store.edit { it[key] = raw }
    }

    override suspend fun clear() {
        store.edit { it.remove(key) }
    }
}
