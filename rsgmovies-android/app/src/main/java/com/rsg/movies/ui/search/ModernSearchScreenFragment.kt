package com.rsg.movies.ui.search

import android.content.Intent
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.EditorInfo
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.rsg.movies.R
import com.rsg.movies.data.ConfigManager
import com.rsg.movies.data.api.ApiClient
import com.rsg.movies.data.model.Genre
import com.rsg.movies.data.model.MediaItem
import com.rsg.movies.ui.adapters.GenreChipAdapter
import com.rsg.movies.ui.adapters.ModernMediaCardAdapter
import com.rsg.movies.ui.details.DetailsActivity
import com.rsg.movies.ui.moviebox.MovieboxDetailActivity
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.absoluteValue

class ModernSearchScreenFragment : Fragment() {

    private lateinit var etSearchQuery: EditText
    private lateinit var btnClear: Button
    private lateinit var tvEmptyHint: TextView
    private lateinit var rvSources: RecyclerView
    private lateinit var rvResults: RecyclerView
    private lateinit var pbLoading: ProgressBar

    private val allResults = mutableListOf<MediaItem>()
    private val displayedResults = mutableListOf<MediaItem>()
    private val movieboxSubjectMap = mutableMapOf<Long, String>()
    private lateinit var resultsAdapter: ModernMediaCardAdapter

    private var activeSourceTab: String = "all"
    private var currentQuery: String = ""
    private var searchJob: Job? = null

    private val searchSources = listOf(
        Genre(rawId = "all", name = "All Sources"),
        Genre(rawId = "blast", name = "MovieBlast"),
        Genre(rawId = "moviebox", name = "Moviebox")
    )

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_search_modern, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        etSearchQuery = view.findViewById(R.id.et_search_query)
        btnClear = view.findViewById(R.id.btn_clear_search)
        tvEmptyHint = view.findViewById(R.id.tv_search_empty_hint)
        rvSources = view.findViewById(R.id.rv_search_sources)
        rvResults = view.findViewById(R.id.rv_search_results)
        pbLoading = view.findViewById(R.id.pb_search_loading)

        com.rsg.movies.ui.TvFocusHelper.attachHorizontalRowFocus(
            recyclerView = rvSources,
            onLeftAtStart = { com.rsg.movies.ui.TvFocusHelper.focusSidebar(activity) },
            upTarget = etSearchQuery,
            downTarget = rvResults
        )

        val sourceChipAdapter = GenreChipAdapter(searchSources, 0) { src, _ ->
            activeSourceTab = src.id
            filterDisplayedResults()
        }
        rvSources.adapter = sourceChipAdapter

        com.rsg.movies.ui.TvFocusHelper.attachGridFocus(rvResults, 5) {
            com.rsg.movies.ui.TvFocusHelper.focusSidebar(activity)
        }

        resultsAdapter = ModernMediaCardAdapter(displayedResults, onItemClick = { item ->
            val mbSubjectId = if (item.subtitle?.startsWith("moviebox:") == true) {
                item.subtitle.removePrefix("moviebox:")
            } else {
                movieboxSubjectMap[item.id]
            }

            if (!mbSubjectId.isNullOrBlank()) {
                val intent = Intent(requireContext(), MovieboxDetailActivity::class.java).apply {
                    putExtra("SUBJECT_ID", mbSubjectId)
                }
                startActivity(intent)
            } else {
                val intent = Intent(requireContext(), DetailsActivity::class.java).apply {
                    val resolvedId = if (item.id != 0L) item.id else (item.seriesId ?: item.featuredId ?: 0L)
                    putExtra("MEDIA_ID", resolvedId.toString())
                    putExtra("MEDIA_TYPE", if (item.isSeriesType()) "serie" else "movie")
                }
                startActivity(intent)
            }
        })
        rvResults.adapter = resultsAdapter

        etSearchQuery.setOnKeyListener { _, keyCode, event ->
            if (event.action == android.view.KeyEvent.ACTION_DOWN) {
                if (keyCode == android.view.KeyEvent.KEYCODE_DPAD_LEFT && etSearchQuery.selectionStart == 0) {
                    com.rsg.movies.ui.TvFocusHelper.focusSidebar(activity)
                    return@setOnKeyListener true
                } else if (keyCode == android.view.KeyEvent.KEYCODE_DPAD_DOWN) {
                    if (rvSources.visibility == View.VISIBLE) {
                        rvSources.requestFocus()
                        return@setOnKeyListener true
                    } else if (rvResults.visibility == View.VISIBLE) {
                        rvResults.requestFocus()
                        return@setOnKeyListener true
                    }
                }
            }
            false
        }

        btnClear.setOnClickListener {
            etSearchQuery.setText("")
            allResults.clear()
            displayedResults.clear()
            movieboxSubjectMap.clear()
            resultsAdapter.notifyDataSetChanged()
            tvEmptyHint.visibility = View.VISIBLE
            rvSources.visibility = View.GONE
            rvResults.visibility = View.GONE
            btnClear.visibility = View.GONE
        }

        etSearchQuery.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_SEARCH) {
                searchJob?.cancel()
                performSearch(etSearchQuery.text.toString().trim())
                true
            } else {
                false
            }
        }

        etSearchQuery.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                val q = s?.toString()?.trim() ?: ""
                btnClear.visibility = if (q.isNotEmpty()) View.VISIBLE else View.GONE
                searchJob?.cancel()
                searchJob = lifecycleScope.launch {
                    delay(400)
                    if (q.length >= 2) {
                        performSearch(q)
                    } else if (q.isEmpty()) {
                        allResults.clear()
                        displayedResults.clear()
                        movieboxSubjectMap.clear()
                        resultsAdapter.notifyDataSetChanged()
                        tvEmptyHint.visibility = View.VISIBLE
                        rvSources.visibility = View.GONE
                        rvResults.visibility = View.GONE
                    }
                }
            }
            override fun afterTextChanged(s: Editable?) {}
        })

        // Handle navigation up from search sources to search bar
        rvSources.addOnChildAttachStateChangeListener(object : RecyclerView.OnChildAttachStateChangeListener {
            override fun onChildViewAttachedToWindow(view: View) {
                view.setOnKeyListener { _, keyCode, event ->
                    if (event.action == android.view.KeyEvent.ACTION_DOWN) {
                        if (keyCode == android.view.KeyEvent.KEYCODE_DPAD_UP) {
                            etSearchQuery.requestFocus()
                            return@setOnKeyListener true
                        } else if (keyCode == android.view.KeyEvent.KEYCODE_DPAD_DOWN) {
                            if (rvResults.visibility == View.VISIBLE) {
                                rvResults.requestFocus()
                                return@setOnKeyListener true
                            }
                        }
                    }
                    false
                }
            }
            override fun onChildViewDetachedFromWindow(view: View) {}
        })

        // Handle navigation up from top row of results grid to search sources or search bar
        rvResults.addOnChildAttachStateChangeListener(object : RecyclerView.OnChildAttachStateChangeListener {
            override fun onChildViewAttachedToWindow(view: View) {
                view.setOnKeyListener { v, keyCode, event ->
                    if (event.action == android.view.KeyEvent.ACTION_DOWN) {
                        val pos = rvResults.getChildAdapterPosition(v)
                        if (keyCode == android.view.KeyEvent.KEYCODE_DPAD_UP && pos in 0..4) {
                            if (rvSources.visibility == View.VISIBLE) {
                                rvSources.requestFocus()
                            } else {
                                etSearchQuery.requestFocus()
                            }
                            return@setOnKeyListener true
                        } else if (keyCode == android.view.KeyEvent.KEYCODE_DPAD_LEFT && pos % 5 == 0) {
                            com.rsg.movies.ui.TvFocusHelper.focusSidebar(activity)
                            return@setOnKeyListener true
                        }
                    }
                    false
                }
            }
            override fun onChildViewDetachedFromWindow(view: View) {}
        })
    }

    private fun performSearch(query: String) {
        if (query.isBlank()) return
        currentQuery = query

        val cacheKey = "search_all_${query.lowercase()}"
        val cached = com.rsg.movies.providers.ContentCache.get<List<MediaItem>>(cacheKey)
        if (!cached.isNullOrEmpty()) {
            pbLoading.visibility = View.GONE
            allResults.clear()
            allResults.addAll(cached)
            for (item in cached) {
                if (item.subtitle?.startsWith("moviebox:") == true) {
                    movieboxSubjectMap[item.id] = item.subtitle.removePrefix("moviebox:")
                }
            }
            rvSources.visibility = View.VISIBLE
            filterDisplayedResults()
            return
        }

        pbLoading.visibility = View.VISIBLE
        tvEmptyHint.visibility = View.GONE

        searchJob?.cancel()
        searchJob = lifecycleScope.launch {
            try {
                // Fetch Blast Search
                val blastDeferred = async {
                    try {
                        val resp = ApiClient.apiService.getBlastSearch(query)
                        if (resp.isSuccessful && resp.body()?.results != null) {
                            resp.body()!!.results!!
                        } else {
                            val dynamicUrl = ConfigManager.getSearchUrl(query)
                            val dynResp = ApiClient.apiService.searchMedia(dynamicUrl)
                            dynResp.body()?.results ?: emptyList<MediaItem>()
                        }
                    } catch (_: Exception) {
                        emptyList<MediaItem>()
                    }
                }

                // Fetch Moviebox Search
                val movieboxDeferred = async {
                    try {
                        val mbResp = ApiClient.movieboxApi.search(query)
                        val rawBody = mbResp.body()
                        val gson = com.google.gson.Gson()
                        val mbItems: List<com.rsg.movies.data.model.MovieboxSubjectItem> = when {
                            rawBody == null || rawBody.isJsonNull -> emptyList()
                            rawBody.isJsonArray -> {
                                val type = object : com.google.gson.reflect.TypeToken<List<com.rsg.movies.data.model.MovieboxSubjectItem>>() {}.type
                                gson.fromJson(rawBody, type) ?: emptyList()
                            }
                            rawBody.isJsonObject -> {
                                val obj = rawBody.asJsonObject
                                val arr = when {
                                    obj.has("items") && obj.get("items").isJsonArray -> obj.getAsJsonArray("items")
                                    obj.has("data") && obj.get("data").isJsonObject && obj.getAsJsonObject("data").has("items") ->
                                        obj.getAsJsonObject("data").getAsJsonArray("items")
                                    obj.has("data") && obj.get("data").isJsonArray -> obj.getAsJsonArray("data")
                                    else -> null
                                }
                                if (arr != null) {
                                    val type = object : com.google.gson.reflect.TypeToken<List<com.rsg.movies.data.model.MovieboxSubjectItem>>() {}.type
                                    gson.fromJson(arr, type) ?: emptyList()
                                } else emptyList()
                            }
                            else -> emptyList()
                        }

                        mbItems.map { mb ->
                            val subId = mb.subjectId ?: ""
                            val fakeId = (subId.hashCode().toLong() and 0x7FFFFFFF) + 1_000_000_000L
                            movieboxSubjectMap[fakeId] = subId

                            val isSeries = mb.isSeries()
                            MediaItem(
                                id = fakeId,
                                title = mb.getCleanTitle(),
                                posterPath = mb.getCoverUrl(),
                                voteAverage = mb.getRating(),
                                type = if (isSeries) "serie" else "movie",
                                genre = mb.genre ?: if (isSeries) "Series" else "Movie",
                                quality = if (isSeries) "SERIES" else "MOVIE",
                                subtitle = "moviebox:$subId",
                                rawYear = mb.getDisplayYear()
                            )
                        }
                    } catch (_: Exception) {
                        emptyList<MediaItem>()
                    }
                }

                val blastItems = blastDeferred.await()
                val movieboxItems = movieboxDeferred.await()

                pbLoading.visibility = View.GONE
                allResults.clear()
                allResults.addAll(blastItems)
                allResults.addAll(movieboxItems)

                if (allResults.isNotEmpty()) {
                    com.rsg.movies.providers.ContentCache.put(cacheKey, allResults)
                    rvSources.visibility = View.VISIBLE
                    filterDisplayedResults()
                } else {
                    rvSources.visibility = View.GONE
                    rvResults.visibility = View.GONE
                    tvEmptyHint.visibility = View.VISIBLE
                    tvEmptyHint.text = "No results found for \"$query\""
                }
            } catch (e: Exception) {
                pbLoading.visibility = View.GONE
                tvEmptyHint.visibility = View.VISIBLE
                tvEmptyHint.text = "Search error: ${e.localizedMessage}"
            }
        }
    }

    private fun isMoviebox(item: MediaItem): Boolean {
        return item.subtitle?.startsWith("moviebox:") == true || movieboxSubjectMap.containsKey(item.id)
    }

    private fun filterDisplayedResults() {
        displayedResults.clear()
        when (activeSourceTab) {
            "blast" -> {
                displayedResults.addAll(allResults.filter { !isMoviebox(it) })
            }
            "moviebox" -> {
                displayedResults.addAll(allResults.filter { isMoviebox(it) })
            }
            else -> {
                displayedResults.addAll(allResults)
            }
        }

        resultsAdapter.notifyDataSetChanged()

        if (displayedResults.isNotEmpty()) {
            rvResults.visibility = View.VISIBLE
            tvEmptyHint.visibility = View.GONE
        } else {
            rvResults.visibility = View.GONE
            tvEmptyHint.visibility = View.VISIBLE
            tvEmptyHint.text = "No results found under this source filter"
        }
    }
}
