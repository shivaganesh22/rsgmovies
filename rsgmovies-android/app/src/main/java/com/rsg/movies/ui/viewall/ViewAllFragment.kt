package com.rsg.movies.ui.viewall

import android.app.AlertDialog
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.core.content.ContextCompat
import androidx.leanback.app.BrowseSupportFragment
import androidx.leanback.app.VerticalGridSupportFragment
import androidx.leanback.widget.*
import com.rsg.movies.data.ConfigManager
import com.rsg.movies.data.api.ApiClient
import com.rsg.movies.data.model.Genre
import com.rsg.movies.data.model.MediaItem
import com.rsg.movies.ui.details.DetailsActivity
import com.rsg.movies.ui.presenters.EpisodeCardPresenter
import com.rsg.movies.ui.presenters.MovieCardPresenter
import kotlinx.coroutines.*

class ViewAllFragment : VerticalGridSupportFragment(), BrowseSupportFragment.MainFragmentAdapterProvider {

    private lateinit var mAdapter: ArrayObjectAdapter
    private var currentPage = 1
    private var isLoading = false
    private var hasMorePages = true

    private var isSeries = false
    private var isEpisodeList = false

    // Tracks the exact API path passed from your Home Screen
    private var originalPath = ""
    private var currentGenreId = "all"
    private var genreList = mutableListOf<Genre>()

    private val mMainFragmentAdapter = BrowseSupportFragment.MainFragmentAdapter(this)
    override fun getMainFragmentAdapter(): BrowseSupportFragment.MainFragmentAdapter<*> {
        return mMainFragmentAdapter
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        originalPath = arguments?.getString("ENDPOINT_PATH") ?: activity?.intent?.getStringExtra("ENDPOINT_PATH") ?: ""
        val passedMediaType = arguments?.getString("MEDIA_TYPE") ?: activity?.intent?.getStringExtra("MEDIA_TYPE")
        val baseTitle = arguments?.getString("TITLE") ?: activity?.intent?.getStringExtra("TITLE") ?: "View All"
        val requestedColumns = arguments?.getInt("COLUMNS", 0) ?: activity?.intent?.getIntExtra("COLUMNS", 0) ?: 0

        isSeries = passedMediaType == "serie"
        isEpisodeList = originalPath.contains("episode", ignoreCase = true) || baseTitle.contains("episode", ignoreCase = true)

        // NOTE: The title assignment has been completely removed!

        setOnSearchClickedListener {
            if (genreList.isNotEmpty()) {
                showGenreFilterDialog()
            } else {
                Toast.makeText(requireContext(), "Loading filters, please wait...", Toast.LENGTH_SHORT).show()
            }
        }

        val presenter = if (isEpisodeList) EpisodeCardPresenter() else MovieCardPresenter()
        val gridPresenter = VerticalGridPresenter(FocusHighlight.ZOOM_FACTOR_NONE, false)
        gridPresenter.numberOfColumns = if (requestedColumns > 0) requestedColumns else if (isEpisodeList) 4 else 6
        this.gridPresenter = gridPresenter

        mAdapter = ArrayObjectAdapter(presenter)
        adapter = mAdapter

        setupItemClickListener()
        setupPagination()

        fetchGenres()
        loadPage()
    }

    // THIS CHANGES THE MAGNIFYING GLASS TO A "3 LINES" ICON
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        try {
            val searchOrb = view.findViewById<SearchOrbView>(androidx.leanback.R.id.search_orb)
            // Using a native Android 3-line sort icon. You can swap this with R.drawable.your_custom_icon
            searchOrb?.setOrbIcon(ContextCompat.getDrawable(requireContext(), android.R.drawable.ic_menu_sort_by_size))
        } catch (e: Exception) {
            // Failsafe in case the Orb view hasn't rendered
        }
    }

    private fun fetchGenres() {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val domain = ConfigManager.getDomain()
                val token = ConfigManager.getEndpointKey()
                val genreUrl = "${domain}api/genres/list/$token"

                val response = ApiClient.apiService.getGenres(genreUrl)

                if (response.isSuccessful) {
                    val fetchedGenres: List<Genre> = response.body()?.genres ?: emptyList<Genre>()
                    genreList.clear()
                    genreList.add(Genre(-1, "All"))
                    genreList.addAll(fetchedGenres)
                }
            } catch (e: Exception) { }
        }
    }

    private fun showGenreFilterDialog() {
        val genreNames = genreList.map { it.name }.toTypedArray()
        AlertDialog.Builder(requireContext(), android.R.style.Theme_DeviceDefault_Dialog_Alert)
            .setTitle("Filter by Genre")
            .setItems(genreNames) { _, which ->
                val selectedGenre = genreList[which]
                applyFilter(selectedGenre)
            }
            .show()
    }

    private fun applyFilter(genre: Genre) {
        currentGenreId = if (genre.name == "All") "all" else genre.id.toString()
        currentPage = 1
        hasMorePages = true
        mAdapter.clear()
        loadPage()
    }

    private fun loadPage() {
        if (isLoading || !hasMorePages) return
        isLoading = true

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val domain = ConfigManager.getDomain()
                val token = ConfigManager.getEndpointKey()

                // THE EXACT ENDPOINT FIX BASED ON YOUR NEW LINKS:
                val fullUrl = if (currentGenreId == "all") {
                    // If no filter is applied, safely load the original category
                    "${domain}api/$originalPath/$token?page=$currentPage"
                } else {
                    // If a filter is applied, use the dedicated mediaLibrary/show endpoint!
                    // Example: api/genres/mediaLibrary/show/10765/serie/TOKEN?page=1
                    val typePath = if (isSeries) "serie" else "movie"
                    "${domain}api/genres/mediaLibrary/show/$currentGenreId/$typePath/$token?page=$currentPage"
                }

                val response = ApiClient.apiService.getMediaList(fullUrl)

                withContext(Dispatchers.Main) {
                    if (response.isSuccessful && response.body() != null) {
                        val items = response.body()?.data
                        if (!items.isNullOrEmpty()) {
                            mAdapter.addAll(mAdapter.size(), items)
                            currentPage++
                        } else {
                            hasMorePages = false
                        }
                    } else {
                        hasMorePages = false
                    }
                    isLoading = false
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    isLoading = false
                    Toast.makeText(requireContext(), "Failed to load content", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun setupPagination() {
        setOnItemViewSelectedListener { _, _, _, _ ->
            val layoutManager = view?.findViewById<androidx.leanback.widget.VerticalGridView>(androidx.leanback.R.id.browse_grid)
            val lastVisibleItem = layoutManager?.getChildAdapterPosition(layoutManager.getChildAt(layoutManager.childCount - 1)) ?: 0

            if (lastVisibleItem >= mAdapter.size() - 8 && !isLoading && hasMorePages) {
                loadPage()
            }
        }
    }

    private fun setupItemClickListener() {
        setOnItemViewClickedListener { _, item, _, _ ->
            val media = item as? MediaItem ?: return@setOnItemViewClickedListener
            startActivity(Intent(requireContext(), DetailsActivity::class.java).apply {
                putExtra("MEDIA_ID", media.id.toString())
                putExtra("MEDIA_TYPE", media.type ?: if (isSeries) "serie" else "movie")
            })
        }
    }
}