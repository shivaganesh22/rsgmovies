package com.rsg.movies.ui.main

import android.content.Intent
import android.os.Bundle
import android.view.View
import androidx.leanback.app.BrowseSupportFragment
import androidx.leanback.app.VerticalGridSupportFragment
import androidx.leanback.widget.*
import com.rsg.movies.data.FavoritesManager
import com.rsg.movies.data.model.MediaItem
import com.rsg.movies.ui.details.DetailsActivity

// 1. ADDED THE INTERFACE HERE
class FavoritesFragment : VerticalGridSupportFragment(), BrowseSupportFragment.MainFragmentAdapterProvider {

    // 2. ADDED THE ADAPTER PROVIDER OVERRIDE HERE
    private val mMainFragmentAdapter = BrowseSupportFragment.MainFragmentAdapter(this)
    override fun getMainFragmentAdapter(): BrowseSupportFragment.MainFragmentAdapter<*> {
        return mMainFragmentAdapter
    }

    private lateinit var gridAdapter: ArrayObjectAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val gridPresenter = VerticalGridPresenter(FocusHighlight.ZOOM_FACTOR_NONE, false)
        gridPresenter.numberOfColumns = 5 // Standard poster grid
        this.gridPresenter = gridPresenter

        gridAdapter = ArrayObjectAdapter(com.rsg.movies.ui.presenters.MovieCardPresenter())
        adapter = gridAdapter
    }

    override fun onResume() {
        super.onResume()
        loadFavorites()
    }

    private fun loadFavorites() {
        val favorites = FavoritesManager.getFavorites(requireContext())
        gridAdapter.clear()

        // Reverse the list so the newest added are at the top
        gridAdapter.addAll(0, favorites.reversed())
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setOnItemViewClickedListener { _, item, _, _ ->
            val media = item as? MediaItem ?: return@setOnItemViewClickedListener
            startActivity(Intent(requireContext(), DetailsActivity::class.java).apply {
                putExtra("MEDIA_ID", media.id.toString())
                putExtra("MEDIA_TYPE", media.type ?: "movie")
            })
        }
    }
}