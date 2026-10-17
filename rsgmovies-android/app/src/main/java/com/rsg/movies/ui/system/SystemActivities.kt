package com.rsg.movies.ui.system

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.FragmentActivity
import com.rsg.movies.R
import com.rsg.movies.data.ConfigManager
import com.rsg.movies.data.model.MaintenanceInfo
import com.rsg.movies.data.model.VersionInfo
import com.rsg.movies.ui.auth.QRLoginActivity
import com.rsg.movies.ui.main.MainActivity
import com.rsg.movies.ui.splash.SplashActivity

class MaintenanceActivity : FragmentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_maintenance)

        val maintenance = intent.getSerializableExtra("MAINTENANCE_INFO") as? MaintenanceInfo

        val tvTitle = findViewById<TextView>(R.id.tv_maintenance_title)
        val tvMessage = findViewById<TextView>(R.id.tv_maintenance_message)
        val btnRetry = findViewById<Button>(R.id.btn_maintenance_retry)

        if (maintenance != null) {
            tvTitle.text = maintenance.title ?: "System Maintenance"
            tvMessage.text = maintenance.message ?: "RSG Movies is currently undergoing scheduled maintenance. Please check back shortly."
        }

        btnRetry.setOnClickListener {
            val intent = Intent(this, SplashActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            }
            startActivity(intent)
            finish()
        }
    }
}

class UpdateActivity : FragmentActivity() {

    private var isMandatory: Boolean = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_update)

        val versionInfo = intent.getSerializableExtra("VERSION_INFO") as? VersionInfo
        isMandatory = intent.getBooleanExtra("IS_MANDATORY", false) || (versionInfo?.is_update_required == true)

        val tvTitle = findViewById<TextView>(R.id.tv_update_title)
        val tvMessage = findViewById<TextView>(R.id.tv_update_message)
        val llNotes = findViewById<LinearLayout>(R.id.ll_release_notes)
        val tvNotes = findViewById<TextView>(R.id.tv_release_notes)
        val btnDownload = findViewById<Button>(R.id.btn_download_update)
        val btnSkip = findViewById<Button>(R.id.btn_skip_update)

        val latestVersion = versionInfo?.latest_version ?: "latest"

        if (isMandatory) {
            tvTitle.text = "Update Required"
            tvMessage.text = "A new version of RSG Movies TV (v$latestVersion) is required to continue streaming."
            btnSkip.visibility = View.GONE
        } else {
            tvTitle.text = "Update Available"
            tvMessage.text = "A new version of RSG Movies TV (v$latestVersion) is available."
            btnSkip.visibility = View.VISIBLE
            btnSkip.setOnClickListener {
                proceedToApp()
            }
        }

        if (!versionInfo?.release_notes.isNullOrBlank()) {
            llNotes.visibility = View.VISIBLE
            tvNotes.text = versionInfo?.release_notes
        }

        btnDownload.setOnClickListener {
            val updateUrl = versionInfo?.update_url
            if (!updateUrl.isNullOrBlank()) {
                try {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(updateUrl)).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                    startActivity(intent)
                } catch (e: Exception) {
                    Toast.makeText(this, "Could not open update link: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
                }
            } else {
                Toast.makeText(this, "No update URL available", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun proceedToApp() {
        if (ConfigManager.isLoggedIn(this)) {
            val intent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            }
            startActivity(intent)
        } else {
            val intent = Intent(this, QRLoginActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            }
            startActivity(intent)
        }
        finish()
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            if (!isMandatory) {
                proceedToApp()
                return true
            }
        }
        return super.onKeyDown(keyCode, event)
    }
}
