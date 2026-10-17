package com.rsg.movies.ui.catalog

import android.os.Bundle
import android.util.TypedValue
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.rsg.movies.R
import com.rsg.movies.data.model.Genre
import com.rsg.movies.data.model.MediaItem
import com.rsg.movies.providers.ContentProviderFactory
import com.rsg.movies.ui.adapters.GenreChipAdapter
import com.rsg.movies.ui.adapters.GridSpacingItemDecoration
import com.rsg.movies.ui.adapters.ModernMediaCardAdapter
import kotlinx.coroutines.launch

class ModernCatalogScreenFragment : Fragment() {

    private var isSeries: Boolean = false

    private lateinit var tvTitle: TextView
    private lateinit var rvGenres: RecyclerView
    private lateinit var rvMediaGrid: RecyclerView
    private lateinit var pbLoading: ProgressBar

    private val mediaList = mutableListOf<MediaItem>()
    private lateinit var mediaAdapter: ModernMediaCardAdapter
    private val genresList = mutableListOf<Genre>()
    private lateinit var genreAdapter: GenreChipAdapter

    private var activeSort: String = "latestadded"
    private var selectedGenreId: String? = null
    private var currentPage: Int = 1
    private var isLoading: Boolean = false
    private var hasMorePages: Boolean = true

    companion object {
        fun newInstance(isSeries: Boolean): ModernCatalogScreenFragment {
            return ModernCatalogScreenFragment().apply {
                arguments = Bundle().apply {
                    putBoolean("IS_SERIES", isSeries)
                }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        isSeries = arguments?.getBoolean("IS_SERIES", false) ?: false
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.fragment_grid_catalog, container, false)

        tvTitle = view.findViewById(R.id.tv_catalog_title)
        rvGenres = view.findViewById(R.id.rv_genre_chips)
        rvMediaGrid = view.findViewById(R.id.rv_catalog_grid)
        pbLoading = view.findViewById(R.id.pb_catalog_loading)

        // Matching Screenshot 8 & 11: "Movies" vs "TV Series"
        tvTitle.text = if (isSeries) "TV Series" else "Movies"

        setupGenres()
        setupMediaGrid()

        loadGenres()
        loadCatalog(pageToLoad = 1, append = false)

        return view
    }

    private fun setupGenres() {
        com.rsg.movies.ui.TvFocusHelper.attachHorizontalRowFocus(rvGenres) {
            com.rsg.movies.ui.TvFocusHelper.focusSidebar(activity)
        }
        genreAdapter = GenreChipAdapter(genresList, 0) { genre, _ ->
            if (genre.id.startsWith("sort_")) {
                activeSort = genre.id.replace("sort_", "")
                selectedGenreId = null
            } else {
                activeSort = "genre"
                selectedGenreId = genre.id
            }
            currentPage = 1
            hasMorePages = true
            loadCatalog(pageToLoad = 1, append = false)
        }
        rvGenres.adapter = genreAdapter
    }

    private fun setupMediaGrid() {
        val spacingPx = TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP, 8f, resources.displayMetrics
        ).toInt()
        rvMediaGrid.addItemDecoration(GridSpacingItemDecoration(6, spacingPx, true))

        com.rsg.movies.ui.TvFocusHelper.attachGridFocus(rvMediaGrid, 6) {
            com.rsg.movies.ui.TvFocusHelper.focusSidebar(activity)
        }

        mediaAdapter = ModernMediaCardAdapter(mediaList)
        rvMediaGrid.adapter = mediaAdapter

        rvMediaGrid.addOnScrollListener(object : RecyclerView.OnScrollListener() {
            override fun onScrolled(recyclerView: RecyclerView, dx: Int, dy: Int) {
                super.onScrolled(recyclerView, dx, dy)
                val layoutManager = recyclerView.layoutManager as androidx.recyclerview.widget.LinearLayoutManager
                val total = layoutManager.itemCount
                val last = layoutManager.findLastVisibleItemPosition()
                if (!isLoading && hasMorePages && total <= (last + 6)) {
                    loadCatalog(pageToLoad = currentPage + 1, append = true)
                }
            }
        })
    }

    private fun loadGenres() {
        genresList.clear()
        // Standard sort and category options matching Screenshots 8 & 11
        genresList.add(Genre("sort_latestadded", "Latest Added"))
        genresList.add(Genre("sort_all", if (isSeries) "All Series" else "All Movies"))
        genresList.add(Genre("sort_byrating", "By Rating"))
        genresList.add(Genre("sort_byviews", "By Views"))
        genresList.add(Genre("sort_byyear", "By Year"))
        genresList.add(Genre("sort_most_popular", "Popular"))
        genresList.add(Genre("sort_trending", "Trending"))
        genresList.add(Genre("sort_thisweek", "New This Week"))
        genreAdapter.notifyDataSetChanged()

        lifecycleScope.launch {
            try {
                val provider = ContentProviderFactory.create()
                val genres = provider.getGenres()
                if (genres.isNotEmpty()) {
                    genresList.addAll(genres)
                    genreAdapter.notifyDataSetChanged()
                }
            } catch (_: Exception) {}
        }
    }

    private fun loadCatalog(pageToLoad: Int, append: Boolean) {
        if (isLoading) return
        isLoading = true

        if (!append) {
            pbLoading.visibility = View.VISIBLE
        }

        lifecycleScope.launch {
            try {
                val provider = ContentProviderFactory.create()
                val resp = if (selectedGenreId != null) {
                    if (isSeries) provider.getSeriesByGenre(selectedGenreId!!, pageToLoad)
                    else provider.getMoviesByGenre(selectedGenreId!!, pageToLoad)
                } else {
                    if (isSeries) provider.getSeriesFilter(activeSort, pageToLoad)
                    else provider.getMoviesFilter(activeSort, pageToLoad)
                }

                pbLoading.visibility = View.GONE
                val items = resp?.data
                if (!items.isNullOrEmpty()) {
                    if (!append) mediaList.clear()
                    val startPos = mediaList.size
                    mediaList.addAll(items)
                    if (!append) mediaAdapter.notifyDataSetChanged()
                    else mediaAdapter.notifyItemRangeInserted(startPos, items.size)

                    currentPage = pageToLoad
                    hasMorePages = resp.hasMorePages()
                } else {
                    if (!append) {
                        mediaList.clear()
                        mediaAdapter.notifyDataSetChanged()
                    }
                    hasMorePages = false
                }
            } catch (e: Exception) {
                pbLoading.visibility = View.GONE
                Toast.makeText(requireContext(), "Failed to load catalog: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            } finally {
                isLoading = false
            }
        }
    }
}
