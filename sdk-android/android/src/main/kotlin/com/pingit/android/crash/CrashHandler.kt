package com.pingit.android.crash

import com.pingit.core.io.CrashSink
import com.pingit.core.model.TestResult

/**
 * Installs an uncaught-exception handler that synchronously persists the crash
 * (plus the most recent test result, if any) before delegating to the
 * previously installed handler so normal crash reporting still occurs.
 */
class CrashHandler private constructor(
    private val sink: CrashSink,
    private val lastResultSupplier: () -> TestResult?,
    private val previous: Thread.UncaughtExceptionHandler?,
) : Thread.UncaughtExceptionHandler {

    override fun uncaughtException(t: Thread, e: Throwable) {
        runCatching { sink.persistCrashSync(e, lastResultSupplier()) }
        previous?.uncaughtException(t, e)
    }

    companion object {
        /** Install the handler, capturing whatever handler was set before. */
        fun install(sink: CrashSink, lastResultSupplier: () -> TestResult?) {
            val previous = Thread.getDefaultUncaughtExceptionHandler()
            // Avoid double-wrapping if already installed.
            if (previous is CrashHandler) return
            Thread.setDefaultUncaughtExceptionHandler(
                CrashHandler(sink, lastResultSupplier, previous),
            )
        }
    }
}
