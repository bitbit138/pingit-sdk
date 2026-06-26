package com.pingit.android.net

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import com.pingit.core.io.Connectivity

/**
 * Android [Connectivity] backed by [ConnectivityManager]. Data-saver status is
 * derived from `restrictBackgroundStatus`.
 */
class AndroidConnectivity(context: Context) : Connectivity {

    private val cm = context.applicationContext
        .getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

    override fun isConnected(): Boolean {
        val network = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(network) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
            caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }

    override fun osDataSaverEnabled(): Boolean {
        // RESTRICT_BACKGROUND_STATUS_ENABLED means Data Saver is on and this app
        // is restricted in the background.
        return cm.restrictBackgroundStatus ==
            ConnectivityManager.RESTRICT_BACKGROUND_STATUS_ENABLED
    }
}
