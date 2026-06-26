package com.pingit.sample

import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.pingit.PingIt
import com.pingit.core.model.Profile
import kotlinx.coroutines.launch

/**
 * A small "Hub" demo: it asks the PingIt SDK whether the connection is good
 * enough for a few everyday actions and shows the result. The SDK is initialized
 * automatically on startup from the manifest meta-data, so there is no setup code
 * here; this screen just calls it.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var output: TextView
    private lateinit var checkButton: Button

    // Everyday actions mapped to readiness profiles (mirrors the web demo).
    private val hub = listOf(
        "Messaging" to Profile.MESSAGING,
        "Video call" to Profile.VIDEO_CALL,
        "HD streaming" to Profile.HD_STREAMING,
        "Cloud gaming" to Profile.CLOUD_GAMING,
        "Photo backup" to Profile.LARGE_UPLOAD,
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        output = findViewById(R.id.output)
        checkButton = findViewById(R.id.checkButton)
        checkButton.setOnClickListener { onCheck() }
    }

    private fun onCheck() {
        if (!PingIt.isInitialized()) {
            output.text = getString(R.string.not_initialized)
            return
        }
        val client = PingIt.getInstance()
        checkButton.isEnabled = false
        output.text = getString(R.string.checking)

        lifecycleScope.launch {
            val lines = StringBuilder()
            var summary: String? = null
            try {
                for ((label, profile) in hub) {
                    val result = client.isReadyFor(profile)
                    if (summary == null) {
                        result.measured?.let {
                            summary = "Connection: ${it.score}/100 (${it.label}), " +
                                "${"%.1f".format(it.downloadMbps)} Mbps down"
                        }
                    }
                    val status = if (result.passed) "Ready" else "Not ready (${result.reason})"
                    lines.append(label).append(": ").append(status).append('\n')
                }
            } catch (e: Exception) {
                output.text = getString(R.string.error_generic, e.message ?: "error")
                checkButton.isEnabled = true
                return@launch
            }

            val header = summary?.let { "$it\n\n" } ?: ""
            output.text = header + lines.toString().trimEnd()
            checkButton.isEnabled = true
        }
    }
}
