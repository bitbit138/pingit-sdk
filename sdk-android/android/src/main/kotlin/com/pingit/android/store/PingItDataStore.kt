package com.pingit.android.store

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.preferencesDataStore

/** Single app-wide DataStore used by all PingIt stores. */
internal val Context.pingItDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "pingit",
)
