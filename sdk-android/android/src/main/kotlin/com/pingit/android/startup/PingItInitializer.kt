package com.pingit.android.startup

import android.content.Context
import android.content.pm.PackageManager
import androidx.startup.Initializer
import com.pingit.PingIt
import com.pingit.PingItClient
import com.pingit.core.model.Config
import com.pingit.core.model.HistoryMode

/**
 * Zero-touch initialization via the AndroidX App Startup library.
 *
 * The app does not need to call [PingIt.init] in its Application class. On app
 * startup, App Startup runs this initializer, which reads configuration from
 * <meta-data> in the merged AndroidManifest and creates the default client
 * (available afterwards from [PingIt.getInstance]).
 *
 * Required manifest meta-data (inside the <application> element):
 *
 *     <meta-data android:name="com.pingit.APP_ID"  android:value="app_xxx" />
 *     <meta-data android:name="com.pingit.ENDPOINT" android:value="https://api.example.com" />
 *
 * Optional:
 *
 *     <meta-data android:name="com.pingit.HISTORY_MODE"      android:value="LAST_LOCAL" />
 *     <meta-data android:name="com.pingit.DATA_SAVER"        android:value="false" />
 *     <meta-data android:name="com.pingit.FALLBACK_ENDPOINT" android:value="https://backup.example.com" />
 *
 * To configure the SDK in code instead, disable this initializer in your manifest
 * and call [PingIt.init] yourself:
 *
 *     <provider
 *         android:name="androidx.startup.InitializationProvider"
 *         android:authorities="${'$'}{applicationId}.androidx-startup"
 *         tools:node="merge">
 *         <meta-data android:name="com.pingit.android.startup.PingItInitializer"
 *                    tools:node="remove" />
 *     </provider>
 */
class PingItInitializer : Initializer<PingItClient> {

    override fun create(context: Context): PingItClient {
        val metaData = try {
            context.packageManager
                .getApplicationInfo(context.packageName, PackageManager.GET_META_DATA)
                .metaData
        } catch (e: PackageManager.NameNotFoundException) {
            null
        }

        val appId = metaData?.getString(KEY_APP_ID)?.trim().orEmpty()
        val endpoint = metaData?.getString(KEY_ENDPOINT)?.trim().orEmpty()

        require(appId.isNotEmpty() && endpoint.isNotEmpty()) {
            "PingIt auto-init requires the \"$KEY_APP_ID\" and \"$KEY_ENDPOINT\" " +
                "<meta-data> entries in your AndroidManifest. Add them, or remove the " +
                "PingItInitializer (tools:node=\"remove\") and call PingIt.init(...) yourself."
        }

        val historyMode = metaData?.getString(KEY_HISTORY_MODE)
            ?.trim()
            ?.let { runCatching { HistoryMode.valueOf(it.uppercase()) }.getOrNull() }
            ?: HistoryMode.LAST_LOCAL
        val dataSaver = metaData?.getBoolean(KEY_DATA_SAVER, false) ?: false
        val fallbackEndpoint = metaData?.getString(KEY_FALLBACK_ENDPOINT)?.trim()?.ifEmpty { null }

        val config = Config(
            endpoint = endpoint,
            historyMode = historyMode,
            dataSaver = dataSaver,
            fallbackEndpoint = fallbackEndpoint,
        )
        return PingIt.init(appId, config, context)
    }

    /** No dependencies on other initializers. */
    override fun dependencies(): MutableList<Class<out Initializer<*>>> = mutableListOf()

    private companion object {
        const val KEY_APP_ID = "com.pingit.APP_ID"
        const val KEY_ENDPOINT = "com.pingit.ENDPOINT"
        const val KEY_HISTORY_MODE = "com.pingit.HISTORY_MODE"
        const val KEY_DATA_SAVER = "com.pingit.DATA_SAVER"
        const val KEY_FALLBACK_ENDPOINT = "com.pingit.FALLBACK_ENDPOINT"
    }
}
