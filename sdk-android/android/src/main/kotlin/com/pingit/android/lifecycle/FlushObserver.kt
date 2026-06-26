package com.pingit.android.lifecycle

import android.content.Context
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ProcessLifecycleOwner
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.pingit.android.work.UploadWorker
import java.util.concurrent.TimeUnit

/**
 * Observes the process lifecycle and, when the app goes to background
 * (ON_STOP), enqueues a one-time [UploadWorker] to flush the outbox.
 */
class FlushObserver(context: Context) : DefaultLifecycleObserver {

    private val appContext = context.applicationContext

    /** Register with the process lifecycle owner. Idempotent per instance. */
    fun register() {
        ProcessLifecycleOwner.get().lifecycle.addObserver(this)
    }

    override fun onStop(owner: LifecycleOwner) {
        enqueueUpload(appContext)
    }

    companion object {
        const val WORK_NAME = "pingit-upload"

        fun enqueueUpload(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            val request = OneTimeWorkRequestBuilder<UploadWorker>()
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                .build()
            WorkManager.getInstance(context.applicationContext)
                .enqueueUniqueWork(WORK_NAME, ExistingWorkPolicy.REPLACE, request)
        }
    }
}
