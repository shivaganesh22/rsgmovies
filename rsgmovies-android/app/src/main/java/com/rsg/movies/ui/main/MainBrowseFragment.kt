package com.rsg.movies.ui.main

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.widget.FrameLayout
import android.widget.ImageButton
import androidx.leanback.app.BrowseSupportFragment
import androidx.leanback.widget.*
import com.rsg.movies.R
import com.rsg.movies.ui.search.SearchActivity

class MainBrowseFragment : BrowseSupportFragment() {



    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Hide the built-in title/search-orb area entirely.
        // This is what causes the blank space at the top — Leanback reserves
        // height for the title bar even when title = null.
        title = null
        headersState = HEADERS_HIDDEN
        isHeadersTransitionOnBackEnabled = true

        setupNavigation()
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        // ── STEP 1: Fix left-nav panel alignment ─────────────────────────────
        // BrowseSupportFragment's internal header list scrolls items instead of
        // keeping the cursor fixed. Force WINDOW_ALIGN_NO_EDGE + 50 % so the
        // highlighted item always stays in the vertical centre of the panel.
        try {
            val headersFragment = headersSupportFragment
            headersFragment?.view?.post {
                val headersView = headersFragment.view
                    ?.findViewById<androidx.leanback.widget.VerticalGridView>(
                        androidx.leanback.R.id.browse_headers
                    )
                headersView?.apply {
                    windowAlignment =
                        androidx.leanback.widget.BaseGridView.WINDOW_ALIGN_NO_EDGE
                    windowAlignmentOffsetPercent = 50f
                    windowAlignmentOffset = 0
                    itemAlignmentOffsetPercent = 50f
                    isItemAlignmentOffsetWithPadding = true
                }
            }
        } catch (e: Exception) {
            // Safety: if the internal ID ever changes this won't crash the app
            e.printStackTrace()
        }

        // ── STEP 2: Hide default search orb ──────────────────────────────────
        // The built-in orb sits top-left which overlaps the sliding nav panel.


        // ── STEP 3: Add a focusable search button at the TOP-RIGHT ───────────
        // We attach it to the BrowseSupportFragment's root FrameLayout so it
        // is part of the real view hierarchy and therefore part of the D-pad
        // focus traversal chain.
        val rootFrame = view as? FrameLayout ?: return



        // ── STEP 4: Connect the built-in search orb listener (fallback) ──────
        setOnSearchClickedListener {
            startActivity(Intent(requireContext(), SearchActivity::class.java))
        }
    }

    private fun setupNavigation() {
        mainFragmentRegistry.registerFragment(
            PageRow::class.java,
            object : BrowseSupportFragment.FragmentFactory<androidx.fragment.app.Fragment>() {
                override fun createFragment(row: Any?): androidx.fragment.app.Fragment {
                    val rowId = (row as PageRow).headerItem.id

                    return when (rowId) {
                        0L -> com.rsg.movies.ui.home.HomeFragment()
                        1L -> com.rsg.movies.ui.files.FilesFragment()

                        // ID 2 -> MOVIES (Force 5 columns)
                        2L -> com.rsg.movies.ui.viewall.ViewAllFragment().apply {
                            arguments = Bundle().apply {
                                putString("ENDPOINT_PATH", "genres/movies/all")
                                putString("MEDIA_TYPE", "movie")
                                putInt("COLUMNS", 5) // <-- THE MAGIC LINE
                            }
                        }

                        // ID 3 -> SERIES (Force 5 columns)
                        3L -> com.rsg.movies.ui.viewall.ViewAllFragment().apply {
                            arguments = Bundle().apply {
                                putString("ENDPOINT_PATH", "genres/series/all")
                                putString("MEDIA_TYPE", "serie")
                                putInt("COLUMNS", 5) // <-- THE MAGIC LINE
                            }
                        }

                        4L -> com.rsg.movies.ui.main.FavoritesFragment()
                        else -> com.rsg.movies.ui.home.HomeFragment()
                    }
                }
            }
        )

        val rowsAdapter = ArrayObjectAdapter(ListRowPresenter())
        rowsAdapter.add(PageRow(HeaderItem(0, "Home")))
        rowsAdapter.add(PageRow(HeaderItem(1, "Files")))
        rowsAdapter.add(PageRow(HeaderItem(2, "Movies")))
        rowsAdapter.add(PageRow(HeaderItem(3, "Series")))
        rowsAdapter.add(PageRow(HeaderItem(4, "Favourite")))
        adapter = rowsAdapter
    }
}