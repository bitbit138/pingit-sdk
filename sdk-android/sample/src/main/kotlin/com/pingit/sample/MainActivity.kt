package com.pingit.sample

import android.os.Bundle
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.Spinner
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.pingit.PingIt
import com.pingit.PingItClient
import com.pingit.core.model.Config
import com.pingit.core.model.HistoryMode
import com.pingit.core.model.Profile
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {

    private var client: PingItClient? = null

    private lateinit var endpointInput: EditText
    private lateinit var profileSpinner: Spinner
    private lateinit var output: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        endpointInput = findViewById(R.id.endpoint)
        profileSpinner = findViewById(R.id.profileSpinner)
        output = findViewById(R.id.output)

        profileSpinner.adapter = ArrayAdapter(
            this,
            android.R.layout.simple_spinner_dropdown_item,
            Profile.values().map { it.name },
        )

        findViewById<Button>(R.id.initButton).setOnClickListener { onInit() }
        findViewById<Button>(R.id.readyButton).setOnClickListener { onReady() }
        findViewById<Button>(R.id.runButton).setOnClickListener { onRunTest() }
        findViewById<Button>(R.id.historyButton).setOnClickListener { onHistory() }

        // The SDK auto-initializes on startup from the manifest meta-data, so the
        // client is already available here. Use the Init button only to point the
        // sample at a different endpoint at runtime.
        if (PingIt.isInitialized()) {
            client = PingIt.getInstance()
            endpointInput.setText("http://10.0.2.2:8080")
            output.text = "Ready (auto-initialized). Pick a profile and tap a button."
        }
    }

    private fun onInit() {
        val endpoint = endpointInput.text.toString().trim()
        if (endpoint.isEmpty()) {
            output.text = getString(R.string.error_endpoint_required)
            return
        }
        client = PingIt.init(
            appId = "sample-app",
            config = Config(
                historyMode = HistoryMode.SERVER_HISTORY,
                endpoint = endpoint,
            ),
            context = this,
        )
        output.text = getString(R.string.initialized, endpoint)
    }

    private fun onReady() {
        val c = client ?: run { output.text = getString(R.string.error_not_initialized); return }
        val profile = Profile.valueOf(profileSpinner.selectedItem as String)
        output.text = getString(R.string.checking, profile.name)
        lifecycleScope.launch {
            val result = runCatching { c.isReadyFor(profile) }.getOrElse {
                output.text = getString(R.string.error_generic, it.message ?: "error")
                return@launch
            }
            output.text = buildString {
                append("${profile.name}: ")
                append(if (result.passed) "READY" else "NOT READY")
                append("\nreason: ${result.reason}")
                result.measured?.let {
                    append("\n${formatResult(it.downloadMbps, it.uploadMbps, it.latencyMs, it.jitterMs, it.score, it.label)}")
                }
            }
        }
    }

    private fun onRunTest() {
        val c = client ?: run { output.text = getString(R.string.error_not_initialized); return }
        output.text = getString(R.string.running_test)
        lifecycleScope.launch {
            val result = runCatching { c.runTest() }.getOrElse {
                output.text = getString(R.string.error_generic, it.message ?: "error")
                return@launch
            }
            output.text = formatResult(
                result.downloadMbps, result.uploadMbps, result.latencyMs, result.jitterMs, result.score, result.label,
            )
        }
    }

    private fun onHistory() {
        val c = client ?: run { output.text = getString(R.string.error_not_initialized); return }
        lifecycleScope.launch {
            val history = runCatching { c.getHistory(limit = 20) }.getOrDefault(emptyList())
            output.text = if (history.isEmpty()) {
                getString(R.string.no_history)
            } else {
                history.joinToString("\n") { r ->
                    "score=${r.score} (${r.label})  dl=${"%.1f".format(r.downloadMbps)}Mbps  ts=${r.timestamp}"
                }
            }
        }
    }

    private fun formatResult(
        downloadMbps: Double,
        uploadMbps: Double,
        latencyMs: Double,
        jitterMs: Double,
        score: Int,
        label: String,
    ): String = buildString {
        append("download: ${"%.1f".format(downloadMbps)} Mbps\n")
        append("upload: ${"%.1f".format(uploadMbps)} Mbps\n")
        append("latency: ${"%.0f".format(latencyMs)} ms\n")
        append("jitter: ${"%.1f".format(jitterMs)} ms\n")
        append("score: $score ($label)")
    }
}
