package com.rsg.movies.ui.splash

import android.animation.AnimatorSet
import android.animation.ObjectAnimator
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.animation.OvershootInterpolator
import android.widget.ImageView
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.lifecycleScope
import com.rsg.movies.R
import com.rsg.movies.data.ConfigManager
import com.rsg.movies.data.api.ApiClient
import com.rsg.movies.ui.auth.QRLoginActivity
import com.rsg.movies.ui.main.MainActivity
import com.rsg.movies.ui.system.MaintenanceActivity
import com.rsg.movies.ui.system.UpdateActivity
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class SplashActivity : FragmentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_splash)

        val ivLogo = findViewById<ImageView>(R.id.iv_splash_logo)

        // Smooth spring scale-in animation matching branding requirements
        val scaleX = ObjectAnimator.ofFloat(ivLogo, "scaleX", 0.6f, 1.0f)
        val scaleY = ObjectAnimator.ofFloat(ivLogo, "scaleY", 0.6f, 1.0f)
        val alpha = ObjectAnimator.ofFloat(ivLogo, "alpha", 0.3f, 1.0f)

        AnimatorSet().apply {
            playTogether(scaleX, scaleY, alpha)
            duration = 900
            interpolator = OvershootInterpolator(1.2f)
            start()
        }

        lifecycleScope.launch {
            delay(1200)

            val currentVersion = try {
                val pInfo = packageManager.getPackageInfo(packageName, 0)
                pInfo.versionName ?: "1.0.0"
            } catch (_: Exception) {
                "1.0.0"
            }

            try {
                // 1. Fetch TV Config & System Status on startup every time
                val configResp = ApiClient.tvAuthApi.getTVConfig("AndroidTV", currentVersion)
                if (configResp.isSuccessful && configResp.body() != null) {
                    val tvConfig = configResp.body()!!
                    ConfigManager.tvConfig = tvConfig
                    ConfigManager.blastConfig = tvConfig.blast
                    ConfigManager.setDataMode(this@SplashActivity, tvConfig.data_mode ?: "BACKEND")

                    // Check Maintenance Mode
                    if (tvConfig.maintenance?.is_active == true) {
                        val intent = Intent(this@SplashActivity, MaintenanceActivity::class.java).apply {
                            putExtra("MAINTENANCE_INFO", tvConfig.maintenance)
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                        }
                        startActivity(intent)
                        finish()
                        return@launch
                    }

                    // Check Updates (Required vs Optional)
                    val version = tvConfig.version
                    if (version != null && version.is_update_required) {
                        // MANDATORY UPDATE: Must update to proceed
                        val intent = Intent(this@SplashActivity, UpdateActivity::class.java).apply {
                            putExtra("VERSION_INFO", version)
                            putExtra("IS_MANDATORY", true)
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                        }
                        startActivity(intent)
                        finish()
                        return@launch
                    } else if (version != null && version.has_update) {
                        // OPTIONAL UPDATE: User can update or skip
                        val intent = Intent(this@SplashActivity, UpdateActivity::class.java).apply {
                            putExtra("VERSION_INFO", version)
                            putExtra("IS_MANDATORY", false)
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                        }
                        startActivity(intent)
                        finish()
                        return@launch
                    }
                }
            } catch (_: Exception) {}

            // 2. Check Auth State and Validate Session Token
            if (ConfigManager.isLoggedIn(this@SplashActivity)) {
                try {
                    val validateResp = ApiClient.tvAuthApi.validateSession()
                    if (validateResp.isSuccessful && validateResp.body() != null) {
                        // Valid session -> Proceed to Main Browse Activity
                        val intent = Intent(this@SplashActivity, MainActivity::class.java).apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                        }
                        startActivity(intent)
                        finish()
                        return@launch
                    } else {
                        // 401 or invalid session -> Clear and redirect to QR Login
                        ConfigManager.logout(this@SplashActivity)
                    }
                } catch (e: Exception) {
                    // If network error occurred but token is stored, allow into MainActivity (offline/cached retry)
                    val intent = Intent(this@SplashActivity, MainActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                    }
                    startActivity(intent)
                    finish()
                    return@launch
                }
            }

            // Not logged in or session invalid -> Navigate to QR Login
            val intent = Intent(this@SplashActivity, QRLoginActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            }
            startActivity(intent)
            finish()
        }
    }
}
