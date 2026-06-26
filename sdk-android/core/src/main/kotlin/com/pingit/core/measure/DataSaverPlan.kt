package com.pingit.core.measure

/** Budget for a measurement run: how many bytes/pings to spend. */
data class MeasurementPlan(
    val downloadBytesCap: Long,
    val uploadBytesCap: Long,
    val pingCount: Int,
    val initialChunkBytes: Long,
)

object DataSaverPlan {

    private const val MB = 1024L * 1024L

    /**
     * Normal mode spends a few MB and 10 pings; data-saver mode uses smaller
     * transfers and fewer pings to conserve mobile data.
     */
    fun planFor(dataSaver: Boolean): MeasurementPlan = if (dataSaver) {
        MeasurementPlan(
            downloadBytesCap = 2L * MB,
            uploadBytesCap = 1L * MB,
            pingCount = 5,
            initialChunkBytes = 64L * 1024L,
        )
    } else {
        MeasurementPlan(
            downloadBytesCap = 8L * MB,
            uploadBytesCap = 4L * MB,
            pingCount = 10,
            initialChunkBytes = 128L * 1024L,
        )
    }
}
