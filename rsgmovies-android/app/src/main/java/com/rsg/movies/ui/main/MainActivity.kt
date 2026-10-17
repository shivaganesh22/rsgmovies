package com.rsg.movies.ui.main

import android.animation.ValueAnimator
import android.app.AlertDialog
import android.os.Bundle
import android.util.TypedValue
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.lifecycleScope
import com.rsg.movies.R
import com.rsg.movies.data.ConfigManager
import com.rsg.movies.data.api.ApiClient
import com.rsg.movies.ui.catalog.ModernCatalogScreenFragment
import com.rsg.movies.ui.files.ModernFilesScreenFragment
import com.rsg.movies.ui.home.ModernHomeScreenFragment
import com.rsg.movies.ui.search.ModernSearchScreenFragment
import com.rsg.movies.ui.settings.ModernSettingsScreenFragment
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class MainActivity : FragmentActivity() {

    private lateinit var sidebarContainer: LinearLayout
    private lateinit var llBrandText: LinearLayout

    private lateinit var navHome: LinearLayout
    private lateinit var navMovies: LinearLayout
    private lateinit var navSeries: LinearLayout
    private lateinit var navSearch: LinearLayout
    private lateinit var navFiles: LinearLayout
    private lateinit var navSettings: LinearLayout

    private lateinit var tvLabelHome: TextView
    private lateinit var tvLabelMovies: TextView
    private lateinit var tvLabelSeries: TextView
    private lateinit var tvLabelSearch: TextView
    private lateinit var tvLabelFiles: TextView
    private lateinit var tvLabelSettings: TextView

    private var isSidebarExpanded = false
    private var activeTabId: Int = R.id.nav_home

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        sidebarContainer = findViewById(R.id.sidebar_container)
        llBrandText = findViewById(R.id.ll_brand_text)

        navHome = findViewById(R.id.nav_home)
        navMovies = findViewById(R.id.nav_movies)
        navSeries = findViewById(R.id.nav_series)
        navSearch = findViewById(R.id.nav_search)
        navFiles = findViewById(R.id.nav_files)
        navSettings = findViewById(R.id.nav_settings)

        tvLabelHome = findViewById(R.id.tv_label_home)
        tvLabelMovies = findViewById(R.id.tv_label_movies)
        tvLabelSeries = findViewById(R.id.tv_label_series)
        tvLabelSearch = findViewById(R.id.tv_label_search)
        tvLabelFiles = findViewById(R.id.tv_label_files)
        tvLabelSettings = findViewById(R.id.tv_label_settings)

        val navItems = listOf(navHome, navMovies, navSeries, navSearch, navFiles, navSettings)
        val navLabels = listOf(tvLabelHome, tvLabelMovies, tvLabelSeries, tvLabelSearch, tvLabelFiles, tvLabelSettings)

        fun dpToPx(dp: Float): Int {
            return TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, dp, resources.displayMetrics).toInt()
        }

        val collapsedWidth = dpToPx(64f)
        val expandedWidth = dpToPx(175f)

        fun setSidebarExpanded(expanded: Boolean) {
            if (isSidebarExpanded == expanded) return
            isSidebarExpanded = expanded

            val startWidth = sidebarContainer.width
            val endWidth = if (expanded) expandedWidth else collapsedWidth

            val animator = ValueAnimator.ofInt(startWidth, endWidth).apply {
                duration = 160
                addUpdateListener { anim ->
                    val value = anim.animatedValue as Int
                    val params = sidebarContainer.layoutParams
                    params.width = value
                    sidebarContainer.layoutParams = params
                }
            }
            animator.start()

            if (expanded) {
                llBrandText.visibility = View.VISIBLE
                navLabels.forEach { it.visibility = View.VISIBLE }
            } else {
                llBrandText.visibility = View.GONE
                navLabels.forEach { it.visibility = View.GONE }
            }
        }

        // Attach focus listeners to expand when sidebar has focus and collapse when focus leaves
        navItems.forEach { item ->
            item.setOnFocusChangeListener { _, hasFocus ->
                if (hasFocus) {
                    setSidebarExpanded(true)
                } else {
                    // Check if any other sidebar item is focused
                    sidebarContainer.postDelayed({
                        val anySidebarFocused = navItems.any { it.isFocused }
                        if (!anySidebarFocused) {
                            setSidebarExpanded(false)
                        }
                    }, 50)
                }
            }
        }

        fun selectTab(selectedView: LinearLayout, fragment: Fragment) {
            if (activeTabId != selectedView.id) {
                com.rsg.movies.ui.TvFocusHelper.clearFocusMemory()
            }
            activeTabId = selectedView.id
            navItems.forEach { it.isSelected = (it.id == selectedView.id) }
            supportFragmentManager.beginTransaction()
                .replace(R.id.main_content_frame, fragment)
                .commit()
        }

        navItems.forEach { item ->
            item.setOnKeyListener { _, keyCode, event ->
                if (event.action == android.view.KeyEvent.ACTION_DOWN && keyCode == android.view.KeyEvent.KEYCODE_DPAD_RIGHT) {
                    val restored = com.rsg.movies.ui.TvFocusHelper.restoreLastFocusedContent()
                    if (restored) {
                        return@setOnKeyListener true
                    }
                }
                false
            }
        }

        navHome.setOnClickListener { selectTab(navHome, ModernHomeScreenFragment()) }
        navMovies.setOnClickListener { selectTab(navMovies, ModernCatalogScreenFragment.newInstance(isSeries = false)) }
        navSeries.setOnClickListener { selectTab(navSeries, ModernCatalogScreenFragment.newInstance(isSeries = true)) }
        navSearch.setOnClickListener { selectTab(navSearch, ModernSearchScreenFragment()) }
        navFiles.setOnClickListener { selectTab(navFiles, ModernFilesScreenFragment()) }
        navSettings.setOnClickListener { selectTab(navSettings, ModernSettingsScreenFragment()) }

        if (savedInstanceState == null) {
            selectTab(navHome, ModernHomeScreenFragment())
        }
    }

    override fun onBackPressed() {
        if (activeTabId != R.id.nav_home) {
            navHome.performClick()
            navHome.requestFocus()
        } else {
            showExitConfirmDialog()
        }
    }

    private fun showExitConfirmDialog() {
        AlertDialog.Builder(this, android.R.style.Theme_DeviceDefault_Dialog_Alert)
            .setTitle("Exit RSG Movies")
            .setMessage("Are you sure you want to exit the application?")
            .setPositiveButton("Exit") { _, _ -> finishAffinity() }
            .setNegativeButton("Cancel", null)
            .show()
    }
}