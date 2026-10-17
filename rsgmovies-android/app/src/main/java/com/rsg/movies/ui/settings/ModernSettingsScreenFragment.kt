package com.rsg.movies.ui.settings

import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import android.app.AlertDialog
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.bumptech.glide.Glide
import com.rsg.movies.R
import com.rsg.movies.data.ConfigManager
import com.rsg.movies.data.api.ApiClient
import com.rsg.movies.ui.auth.QRLoginActivity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class ModernSettingsScreenFragment : Fragment() {

    private lateinit var tvUserVal: TextView
    private lateinit var tvEmailVal: TextView
    private lateinit var tvRoleVal: TextView
    private lateinit var tvVersionVal: TextView
    private lateinit var tvDeviceVal: TextView
    private lateinit var tvDataModeVal: TextView
    private lateinit var tvReleaseVal: TextView
    private lateinit var llClearCache: LinearLayout
    private lateinit var llLogout: LinearLayout

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_settings_modern, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        tvUserVal = view.findViewById(R.id.tv_settings_user_val)
        tvEmailVal = view.findViewById(R.id.tv_settings_email_val)
        tvRoleVal = view.findViewById(R.id.tv_settings_role_val)
        tvVersionVal = view.findViewById(R.id.tv_settings_version_val)
        tvDeviceVal = view.findViewById(R.id.tv_settings_device_val)
        tvDataModeVal = view.findViewById(R.id.tv_settings_datamode_val)
        tvReleaseVal = view.findViewById(R.id.tv_settings_release_val)
        llClearCache = view.findViewById(R.id.ll_settings_clear_cache)
        llLogout = view.findViewById(R.id.ll_settings_logout)

        val deviceModel = Build.MODEL ?: "Android TV"
        val dataMode = ConfigManager.getDataMode(requireContext())
        val serverVersion = ConfigManager.tvConfig?.version?.latest_version ?: "1.0.0"

        val appVersion = try {
            requireContext().packageManager.getPackageInfo(requireContext().packageName, 0).versionName ?: "1.0.0"
        } catch (_: Exception) {
            "1.0.0"
        }

        tvUserVal.text = "Loading..."
        tvEmailVal.text = "Loading..."
        tvRoleVal.text = "Loading..."

        tvVersionVal.text = "v$appVersion"
        tvDeviceVal.text = deviceModel
        tvDataModeVal.text = dataMode
        tvReleaseVal.text = "v$serverVersion"

        lifecycleScope.launch {
            try {
                // Fetch fresh config to ensure dataMode and version are 100% up-to-date
                val configResp = ApiClient.tvAuthApi.getTVConfig("AndroidTV", appVersion)
                if (configResp.isSuccessful && configResp.body() != null) {
                    val cfg = configResp.body()!!
                    ConfigManager.tvConfig = cfg
                    ConfigManager.setDataMode(requireContext(), cfg.data_mode ?: "BACKEND")
                    tvDataModeVal.text = cfg.data_mode ?: "BACKEND"
                    cfg.version?.latest_version?.let { tvReleaseVal.text = "v$it" }
                }

                val resp = ApiClient.tvAuthApi.validateSession()
                if (resp.isSuccessful && resp.body()?.valid == true) {
                    val user = resp.body()?.user
                    val name = user?.display_name?.takeIf { it.isNotBlank() } ?: user?.username ?: "RSG User"
                    val email = user?.email?.takeIf { it.isNotBlank() } ?: user?.upn ?: "Connected"
                    val role = user?.role?.takeIf { it.isNotBlank() } ?: if (user?.is_admin == true) "Admin" else "Subscriber"

                    tvUserVal.text = name
                    tvEmailVal.text = email
                    tvRoleVal.text = role
                } else {
                    tvUserVal.text = "RSG User"
                    tvEmailVal.text = "Connected"
                    tvRoleVal.text = "Subscriber"
                }
            } catch (_: Exception) {
                tvUserVal.text = "RSG User"
                tvEmailVal.text = "Connected"
                tvRoleVal.text = "Subscriber"
            }
        }

        llClearCache.setOnClickListener {
            AlertDialog.Builder(requireContext(), android.R.style.Theme_DeviceDefault_Dialog_Alert)
                .setTitle("Clear Media Cache")
                .setMessage("Are you sure you want to clear temporary image and stream caches?")
                .setPositiveButton("Clear") { _, _ ->
                    lifecycleScope.launch(Dispatchers.IO) {
                        Glide.get(requireContext()).clearDiskCache()
                        withContext(Dispatchers.Main) {
                            Glide.get(requireContext()).clearMemory()
                            Toast.makeText(requireContext(), "Media cache cleared successfully", Toast.LENGTH_SHORT).show()
                        }
                    }
                }
                .setNegativeButton("Cancel", null)
                .show()
        }

        llLogout.setOnClickListener {
            AlertDialog.Builder(requireContext(), android.R.style.Theme_DeviceDefault_Dialog_Alert)
                .setTitle("Sign Out of RSG Movies")
                .setMessage("Are you sure you want to disconnect this TV from your account?")
                .setPositiveButton("Sign Out") { _, _ ->
                    lifecycleScope.launch {
                        try {
                            ApiClient.tvAuthApi.logout()
                        } catch (_: Exception) {}
                        
                        ConfigManager.logout(requireContext())
                        ConfigManager.blastConfig = null
                        ConfigManager.tvConfig = null

                        val intent = Intent(requireContext(), QRLoginActivity::class.java).apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                        }
                        startActivity(intent)
                        requireActivity().finish()
                    }
                }
                .setNegativeButton("Cancel", null)
                .show()
        }
    }
}
