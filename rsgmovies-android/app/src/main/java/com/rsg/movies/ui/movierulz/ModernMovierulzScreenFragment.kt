package com.rsg.movies.ui.movierulz

import android.content.Intent
import android.os.Bundle
import android.view.KeyEvent
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.EditorInfo
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.rsg.movies.R
import com.rsg.movies.data.api.ApiClient
import com.rsg.movies.data.model.Genre
import com.rsg.movies.data.model.MovierulzMovieItem
import com.rsg.movies.ui.adapters.GenreChipAdapter
import com.rsg.movies.ui.adapters.GridSpacingItemDecoration
import com.rsg.movies.ui.adapters.MovierulzCardAdapter
import kotlinx.coroutines.launch

class ModernMovierulzScreenFragment : Fragment() {

    private lateinit var etSearch: EditText
    private lateinit var rvCategories: RecyclerView
    private lateinit var rvGrid: RecyclerView
    private lateinit var pbLoading: ProgressBar
    private lateinit var tvEmpty: TextView

    private val moviesList = mutableListOf<MovierulzMovieItem>()
    private lateinit var gridAdapter: MovierulzCardAdapter

    private var activeCategory: String = ""
    private var activeSearchQuery: String = ""

    private val categories = listOf(
        Genre(rawId = "", name = "All Releases"),
        Genre(rawId = "telugu-movies", name = "Telugu"),
        Genre(rawId = "tamil-movies", name = "Tamil"),
        Genre(rawId = "bollywood-movies-page", name = "Hindi"),
        Genre(rawId = "malayalam-movies-page", name = "Malayalam"),
        Genre(rawId = "hollywood-movies-page", name = "English")
    )

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.fragment_movierulz_modern, container, false)

        etSearch = view.findViewById(R.id.et_movierulz_search)
        rvCategories = view.findViewById(R.id.rv_movierulz_categories)
        rvGrid = view.findViewById(R.id.rv_movierulz_grid)
        pbLoading = view.findViewById(R.id.pb_movierulz_loading)
        tvEmpty = view.findViewById(R.id.tv_movierulz_empty)

        rvCategories.layoutManager = LinearLayoutManager(requireContext(), LinearLayoutManager.HORIZONTAL, false)
        rvGrid.layoutManager = GridLayoutManager(requireContext(), 5)
        rvGrid.addItemDecoration(GridSpacingItemDecoration(5, 16, true))

        com.rsg.movies.ui.TvFocusHelper.attachGridFocus(rvGrid, 5) {
            com.rsg.movies.ui.TvFocusHelper.focusSidebar(activity)
        }

        setupCategories()
        setupGrid()
        setupSearch()

        loadMovies()

        return view
    }

    private fun setupCategories() {
        com.rsg.movies.ui.TvFocusHelper.attachHorizontalRowFocus(rvCategories) {
            com.rsg.movies.ui.TvFocusHelper.focusSidebar(activity)
        }

        val catAdapter = GenreChipAdapter(categories, 0) { genre, _ ->
            activeCategory = genre.id
            activeSearchQuery = ""
            etSearch.setText("")
            loadMovies()
        }
        rvCategories.adapter = catAdapter
    }

    private fun setupGrid() {
        gridAdapter = MovierulzCardAdapter(moviesList) { item ->
            val cleanSlug = item.getCleanSlug()
            if (cleanSlug.isNotBlank()) {
                val intent = Intent(requireContext(), MovierulzDetailActivity::class.java).apply {
                    putExtra("SLUG", cleanSlug)
                    putExtra("NAME", item.getDisplayTitle())
                    putExtra("IMAGE", item.image ?: "")
                    putExtra("QUALITY", item.quality ?: "HD")
                }
                startActivity(intent)
            }
        }
        rvGrid.adapter = gridAdapter
    }

    private fun setupSearch() {
        etSearch.setOnKeyListener { _, keyCode, event ->
            if (event.action == KeyEvent.ACTION_DOWN && keyCode == KeyEvent.KEYCODE_DPAD_LEFT) {
                if (etSearch.selectionStart == 0) {
                    com.rsg.movies.ui.TvFocusHelper.focusSidebar(activity)
                    return@setOnKeyListener true
                }
            }
            false
        }

        etSearch.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_SEARCH) {
                val q = etSearch.text.toString().trim()
                if (q.isNotEmpty()) {
                    activeSearchQuery = q
                    activeCategory = ""
                    loadMovies()
                }
                true
            } else {
                false
            }
        }
    }

    private fun loadMovies() {
        pbLoading.visibility = View.VISIBLE
        tvEmpty.visibility = View.GONE

        lifecycleScope.launch {
            try {
                val resp = if (activeSearchQuery.isNotBlank()) {
                    ApiClient.scrapersApi.searchMovierulz(activeSearchQuery)
                } else {
                    ApiClient.scrapersApi.getMovierulz(activeCategory)
                }

                pbLoading.visibility = View.GONE
                if (resp.isSuccessful && !resp.body()?.movies.isNullOrEmpty()) {
                    moviesList.clear()
                    moviesList.addAll(resp.body()!!.movies!!)
                    gridAdapter.notifyDataSetChanged()
                    rvGrid.visibility = View.VISIBLE
                } else {
                    moviesList.clear()
                    gridAdapter.notifyDataSetChanged()
                    tvEmpty.visibility = View.VISIBLE
                }
            } catch (e: Exception) {
                pbLoading.visibility = View.GONE
                tvEmpty.text = "Error loading Movierulz: ${e.localizedMessage}"
                tvEmpty.visibility = View.VISIBLE
            }
        }
    }
}
