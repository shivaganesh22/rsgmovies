package com.rsg.movies.ui.tamilmv

import android.content.Intent
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.KeyEvent
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.rsg.movies.R
import com.rsg.movies.data.api.ApiClient
import com.rsg.movies.data.model.Genre
import com.rsg.movies.data.model.TamilmvItem
import com.rsg.movies.ui.adapters.GenreChipAdapter
import com.rsg.movies.ui.adapters.TamilmvCardAdapter
import kotlinx.coroutines.launch

class ModernTamilmvScreenFragment : Fragment() {

    private lateinit var etSearch: EditText
    private lateinit var rvLanguages: RecyclerView
    private lateinit var rvItems: RecyclerView
    private lateinit var pbLoading: ProgressBar
    private lateinit var tvEmpty: TextView

    private val allReleases = mutableListOf<TamilmvItem>()
    private val displayedReleases = mutableListOf<TamilmvItem>()
    private lateinit var cardAdapter: TamilmvCardAdapter

    private var activeLanguage: String = "All"
    private var filterQuery: String = ""

    private val languages = listOf("All", "Telugu", "Tamil", "Hindi", "Malayalam", "Kannada", "English")

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.fragment_tamilmv_modern, container, false)

        etSearch = view.findViewById(R.id.et_tamilmv_search)
        rvLanguages = view.findViewById(R.id.rv_tamilmv_languages)
        rvItems = view.findViewById(R.id.rv_tamilmv_items)
        pbLoading = view.findViewById(R.id.pb_tamilmv_loading)
        tvEmpty = view.findViewById(R.id.tv_tamilmv_empty)

        rvLanguages.layoutManager = LinearLayoutManager(requireContext(), LinearLayoutManager.HORIZONTAL, false)
        rvItems.layoutManager = LinearLayoutManager(requireContext())

        setupLanguages()
        setupList()
        setupSearch()

        loadTamilmv()

        return view
    }

    private fun setupLanguages() {
        com.rsg.movies.ui.TvFocusHelper.attachHorizontalRowFocus(rvLanguages) {
            com.rsg.movies.ui.TvFocusHelper.focusSidebar(activity)
        }

        val genreList = languages.map { Genre(rawId = it, name = it) }
        val langAdapter = GenreChipAdapter(genreList, 0) { genre, _ ->
            activeLanguage = genre.id
            applyFilter()
        }
        rvLanguages.adapter = langAdapter
    }

    private fun setupList() {
        cardAdapter = TamilmvCardAdapter(displayedReleases) { item ->
            val link = item.link ?: ""
            if (link.isNotBlank()) {
                val intent = Intent(requireContext(), TamilmvDetailActivity::class.java).apply {
                    putExtra("LINK", link)
                    putExtra("TITLE", item.name ?: "")
                }
                startActivity(intent)
            }
        }
        rvItems.adapter = cardAdapter
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

        etSearch.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                filterQuery = s?.toString()?.trim() ?: ""
                applyFilter()
            }
            override fun afterTextChanged(s: Editable?) {}
        })
    }

    private fun loadTamilmv() {
        pbLoading.visibility = View.VISIBLE
        tvEmpty.visibility = View.GONE

        lifecycleScope.launch {
            try {
                val resp = ApiClient.scrapersApi.getTamilmv()
                pbLoading.visibility = View.GONE
                if (resp.isSuccessful && !resp.body()?.items.isNullOrEmpty()) {
                    allReleases.clear()
                    allReleases.addAll(resp.body()!!.items!!)
                    applyFilter()
                } else {
                    tvEmpty.visibility = View.VISIBLE
                }
            } catch (e: Exception) {
                pbLoading.visibility = View.GONE
                tvEmpty.text = "Failed to load TamilMV feed: ${e.localizedMessage}"
                tvEmpty.visibility = View.VISIBLE
            }
        }
    }

    private fun applyFilter() {
        val q = filterQuery.lowercase()
        val lang = activeLanguage.lowercase()

        val filtered = allReleases.filter { item ->
            val titleMatches = q.isEmpty() ||
                    (item.name ?: "").lowercase().contains(q) ||
                    (item.slug ?: "").lowercase().contains(q)

            val itemLangs = item.getDisplayLanguages().map { it.lowercase() }
            val langMatches = (activeLanguage == "All") || itemLangs.any { it.contains(lang) }

            titleMatches && langMatches
        }

        displayedReleases.clear()
        displayedReleases.addAll(filtered)
        cardAdapter.notifyDataSetChanged()

        tvEmpty.visibility = if (displayedReleases.isEmpty()) View.VISIBLE else View.GONE
    }
}
