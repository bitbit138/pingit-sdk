package com.pingit.android.store

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.pingit.core.io.Outbox
import com.pingit.core.io.OutboxItem
import com.pingit.core.io.OutboxKind
import com.pingit.core.model.TestResult
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.util.UUID

/**
 * Bounded DataStore-backed outbox for pending result/crash uploads. When the
 * queue exceeds [capacity], the oldest items are dropped.
 */
class DataStoreOutbox(
    context: Context,
    private val capacity: Int = 100,
) : Outbox {

    private val store = context.applicationContext.pingItDataStore
    private val key = stringPreferencesKey("outbox")
    private val mutex = Mutex()

    override suspend fun enqueueResult(r: TestResult) = mutate { items ->
        items + OutboxItem(UUID.randomUUID().toString(), OutboxKind.RESULT, result = r)
    }

    override suspend fun enqueueCrash(message: String, stack: String?) = mutate { items ->
        items + OutboxItem(UUID.randomUUID().toString(), OutboxKind.CRASH, crashMessage = message, crashStack = stack)
    }

    override suspend fun peekAll(): List<OutboxItem> = read()

    override suspend fun remove(id: String) = mutate { items ->
        items.filterNot { it.id == id }
    }

    private suspend fun read(): List<OutboxItem> {
        val raw = store.data.first()[key] ?: return emptyList()
        return runCatching {
            storeJson.decodeFromString(OutboxRecord.serializer(), raw).items.map { it.toModel() }
        }.getOrDefault(emptyList())
    }

    private suspend fun mutate(transform: (List<OutboxItem>) -> List<OutboxItem>) = mutex.withLock {
        val current = read()
        val next = transform(current).let { if (it.size > capacity) it.takeLast(capacity) else it }
        val record = OutboxRecord(next.map { it.toRecord() })
        val raw = storeJson.encodeToString(OutboxRecord.serializer(), record)
        store.edit { it[key] = raw }
    }
}
