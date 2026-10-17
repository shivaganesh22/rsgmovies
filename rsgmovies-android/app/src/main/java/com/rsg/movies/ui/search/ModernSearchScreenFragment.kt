package com.rsg.movies.ui.search

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
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.rsg.movies.R
import com.rsg.movies.data.ConfigManager
import com.rsg.movies.data.api.ApiClient
import com.rsg.movies.data.model.MediaItem
import com.rsg.movies.ui.adapters.ModernMediaCardAdapter
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class ModernSearchScreenFragment : Fragment() {

    private lateinit var etSearchQuery: EditText
    private lateinit var btnClear: Button
    private lateinit var tvEmptyHint: TextView
    private lateinit var rvResults: RecyclerView
    private lateinit var pbLoading: ProgressBar

    private val searchResults = mutableListOf<MediaItem>()
    private lateinit var resultsAdapter: ModernMediaCardAdapter
    private var searchJob: Job? = null

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
        rvResults = view.findViewById(R.id.rv_search_results)
        pbLoading = view.findViewById(R.id.pb_search_loading)

        com.rsg.movies.ui.TvFocusHelper.attachGridFocus(rvResults, 5) {
            com.rsg.movies.ui.TvFocusHelper.focusSidebar(activity)
        }
        resultsAdapter = ModernMediaCardAdapter(searchResults)
        rvResults.adapter = resultsAdapter

        etSearchQuery.setOnKeyListener { _, keyCode, event ->
            if (event.action == android.view.KeyEvent.ACTION_DOWN && keyCode == android.view.KeyEvent.KEYCODE_DPAD_LEFT) {
                if (etSearchQuery.selectionStart == 0) {
                    com.rsg.movies.ui.TvFocusHelper.focusSidebar(activity)
                    return@setOnKeyListener true
                }
            }
            false
        }

        btnClear.setOnClickListener {
            etSearchQuery.setText("")
            searchResults.clear()
            resultsAdapter.notifyDataSetChanged()
            tvEmptyHint.visibility = View.VISIBLE
            rvResults.visibility = View.GONE
            btnClear.visibility = View.GONE
        }

        etSearchQuery.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_SEARCH) {
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
                    delay(350)
                    if (q.length >= 2) {
                        performSearch(q)
                    } else if (q.isEmpty()) {
                        searchResults.clear()
                        resultsAdapter.notifyDataSetChanged()
                        tvEmptyHint.visibility = View.VISIBLE
                        rvResults.visibility = View.GONE
                    }
                }
            }
            override fun afterTextChanged(s: Editable?) {}
        })
    }

    private fun performSearch(query: String) {
        if (query.isBlank()) return
        pbLoading.visibility = View.VISIBLE
        tvEmptyHint.visibility = View.GONE

        lifecycleScope.launch {
            try {
                val resp = ApiClient.apiService.getBlastSearch(query)
                val items = if (resp.isSuccessful && resp.body()?.results != null) {
                    resp.body()!!.results!!
                } else {
                    val dynamicUrl = ConfigManager.getSearchUrl(query)
                    val dynResp = ApiClient.apiService.searchMedia(dynamicUrl)
                    dynResp.body()?.results ?: emptyList<MediaItem>()
                }

                pbLoading.visibility = View.GONE
                searchResults.clear()
                searchResults.addAll(items)
                resultsAdapter.notifyDataSetChanged()

                if (searchResults.isNotEmpty()) {
                    rvResults.visibility = View.VISIBLE
                    tvEmptyHint.visibility = View.GONE
                } else {
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
}
