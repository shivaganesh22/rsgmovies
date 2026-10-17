package com.rsg.movies.ui.search

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.speech.RecognizerIntent
import android.view.View
import android.view.inputmethod.InputMethodManager
import android.widget.Toast
import androidx.leanback.app.SearchSupportFragment
import androidx.leanback.widget.ArrayObjectAdapter
import androidx.leanback.widget.HeaderItem
import androidx.leanback.widget.ListRow
import androidx.leanback.widget.ListRowPresenter
import androidx.leanback.widget.ObjectAdapter
import androidx.leanback.widget.SearchEditText
import com.rsg.movies.data.ConfigManager
import com.rsg.movies.data.api.ApiClient
import com.rsg.movies.data.model.MediaItem
import com.rsg.movies.ui.details.DetailsActivity
import com.rsg.movies.ui.presenters.MovieCardPresenter
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class SearchFragment : SearchSupportFragment(), SearchSupportFragment.SearchResultProvider {

    private lateinit var rowsAdapter: ArrayObjectAdapter
    private var searchJob: Job? = null

    // 1. Voice Search variables
    private var isFirstVoiceCall = true
    private val VOICE_REQUEST_CODE = 1002

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        rowsAdapter = ArrayObjectAdapter(ListRowPresenter())
        setSearchResultProvider(this)

        // 2. THE VOICE FIX: Delegate to Native Google Assistant!
        setSpeechRecognitionCallback {
            if (isFirstVoiceCall) {
                // Ignore Leanback's annoying auto-start when the page opens!
                isFirstVoiceCall = false
                return@setSpeechRecognitionCallback
            }

            // Launch the beautiful native Android TV Voice overlay
            try {
                val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                }
                startActivityForResult(intent, VOICE_REQUEST_CODE)
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "Voice search not supported on this device", Toast.LENGTH_SHORT).show()
            }
        }

        setOnItemViewClickedListener { _, item, _, _ ->
            val media = item as? MediaItem ?: return@setOnItemViewClickedListener
            startActivity(Intent(requireContext(), DetailsActivity::class.java).apply {
                putExtra("MEDIA_ID", media.featuredId?.toString() ?: media.id.toString())
                val type = media.type ?: ""
                val isSeriesContent = type.equals("serie", true) || type.equals("episode", true) || media.seasonNumber != null || media.episodeNumber != null
                putExtra("MEDIA_TYPE", if (isSeriesContent) "serie" else "movie")
            })
        }
    }

    // 3. Catch the Native Voice Result and trigger the search!
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == VOICE_REQUEST_CODE && resultCode == Activity.RESULT_OK) {
            val matches = data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
            if (!matches.isNullOrEmpty()) {
                val spokenQuery = matches[0]
                // This updates the text box AND triggers onQueryTextSubmit automatically
                setSearchQuery(spokenQuery, true)
            }
        }
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val searchEditText = view.findViewById<SearchEditText>(androidx.leanback.R.id.lb_search_text_editor)
        searchEditText?.setOnKeyboardDismissListener {
            // Keep empty! Focus remains safely on the search bar for the Back button fix.
        }
    }

    override fun getResultsAdapter(): ObjectAdapter {
        return rowsAdapter
    }

    override fun onQueryTextSubmit(query: String?): Boolean {
        // 4. FIX NOT FETCHING: Explicitly fetch here so Voice Search works!
        if (!query.isNullOrBlank()) {
            performSearch(query)
        }

        // Hide keyboard and drop cursor
        val focusedView = view?.findFocus()
        if (focusedView != null) {
            val imm = requireContext().getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
            imm.hideSoftInputFromWindow(focusedView.windowToken, 0)

            if (rowsAdapter.size() > 0) {
                focusedView.clearFocus()
            }
        }
        return true
    }

    override fun onQueryTextChange(newQuery: String?): Boolean {
        searchJob?.cancel()

        if (newQuery.isNullOrBlank()) {
            rowsAdapter.clear()
            return true
        }

        searchJob = CoroutineScope(Dispatchers.Main).launch {
            delay(300) // Debounce typing
            performSearch(newQuery)
        }
        return true
    }

    private fun performSearch(query: String) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val url = ConfigManager.getSearchUrl(query)
                val response = ApiClient.apiService.searchMedia(url)

                if (response.isSuccessful) {
                    val searchResults = response.body()?.results ?: emptyList<MediaItem>()

                    withContext(Dispatchers.Main) {
                        rowsAdapter.clear()

                        if (searchResults.isNotEmpty()) {
                            val listRowAdapter = ArrayObjectAdapter(MovieCardPresenter())
                            listRowAdapter.addAll(0, searchResults)

                            val header = HeaderItem("Search Results for '$query'")
                            rowsAdapter.add(ListRow(header, listRowAdapter))
                        } else {
                            val emptyAdapter = ArrayObjectAdapter(MovieCardPresenter())
                            rowsAdapter.add(ListRow(HeaderItem("No results found for '$query'"), emptyAdapter))
                        }
                    }
                } else {
                    withContext(Dispatchers.Main) {
                        Toast.makeText(requireContext(), "Server Error: ${response.code()}", Toast.LENGTH_SHORT).show()
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    Toast.makeText(requireContext(), "Search failed: Network Error", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
}