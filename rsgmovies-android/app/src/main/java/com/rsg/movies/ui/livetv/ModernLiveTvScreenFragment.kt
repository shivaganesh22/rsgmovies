package com.rsg.movies.ui.livetv

import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.net.Uri
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
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.rsg.movies.R
import com.rsg.movies.data.LiveTvFavoritesManager
import com.rsg.movies.data.api.ApiClient
import com.rsg.movies.data.model.Genre
import com.rsg.movies.data.model.LiveTvChannel
import com.rsg.movies.ui.adapters.GenreChipAdapter
import com.rsg.movies.ui.adapters.GridSpacingItemDecoration
import com.rsg.movies.ui.adapters.LiveTvCardAdapter
import com.rsg.movies.ui.player.PlayerActivity
import kotlinx.coroutines.launch

class ModernLiveTvScreenFragment : Fragment() {

    private lateinit var etSearch: EditText
    private lateinit var btnClearSearch: Button
    private lateinit var rvCategories: RecyclerView
    private lateinit var rvGrid: RecyclerView
    private lateinit var pbLoading: ProgressBar
    private lateinit var tvEmpty: TextView

    private val allLoadedChannels = mutableListOf<LiveTvChannel>()
    private val displayedChannels = mutableListOf<LiveTvChannel>()
    private lateinit var gridAdapter: LiveTvCardAdapter

    private var activeCategory: String = "All"
    private var searchQuery: String = ""

    private val categoriesList = mutableListOf(
        Genre(rawId = "All", name = "All Channels"),
        Genre(rawId = "Favorites", name = "★ Favorites"),
        Genre(rawId = "Entertainment", name = "Entertainment"),
        Genre(rawId = "Movies", name = "Movies"),
        Genre(rawId = "News", name = "News"),
        Genre(rawId = "Music", name = "Music"),
        Genre(rawId = "Sports", name = "Sports"),
        Genre(rawId = "Kids", name = "Kids"),
        Genre(rawId = "Religious", name = "Religious"),
        Genre(rawId = "Education", name = "Education"),
        Genre(rawId = "Documentary", name = "Documentary"),
        Genre(rawId = "General", name = "General")
    )
    private lateinit var catAdapter: GenreChipAdapter

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.fragment_livetv_modern, container, false)

        etSearch = view.findViewById(R.id.et_livetv_search)
        btnClearSearch = view.findViewById(R.id.btn_clear_livetv_search)
        rvCategories = view.findViewById(R.id.rv_livetv_categories)
        rvGrid = view.findViewById(R.id.rv_livetv_grid)
        pbLoading = view.findViewById(R.id.pb_livetv_loading)
        tvEmpty = view.findViewById(R.id.tv_livetv_empty)

        rvGrid.layoutManager = GridLayoutManager(requireContext(), 5)
        rvGrid.addItemDecoration(GridSpacingItemDecoration(5, 16, true))

        setupSearch()
        setupCategories()
        setupGrid()

        loadChannels()

        return view
    }

    private fun setupSearch() {
        etSearch.setOnKeyListener { _, keyCode, event ->
            if (event.action == android.view.KeyEvent.ACTION_DOWN) {
                if (keyCode == android.view.KeyEvent.KEYCODE_DPAD_LEFT && etSearch.selectionStart == 0) {
                    com.rsg.movies.ui.TvFocusHelper.focusSidebar(activity)
                    return@setOnKeyListener true
                } else if (keyCode == android.view.KeyEvent.KEYCODE_DPAD_DOWN) {
                    if (rvCategories.visibility == View.VISIBLE) {
                        rvCategories.requestFocus()
                        return@setOnKeyListener true
                    } else if (rvGrid.visibility == View.VISIBLE) {
                        rvGrid.requestFocus()
                        return@setOnKeyListener true
                    }
                }
            }
            false
        }

        btnClearSearch.setOnClickListener {
            etSearch.setText("")
            searchQuery = ""
            btnClearSearch.visibility = View.GONE
            filterChannels()
        }

        etSearch.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_SEARCH) {
                searchQuery = etSearch.text.toString().trim()
                filterChannels()
                true
            } else {
                false
            }
        }

        etSearch.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                searchQuery = s?.toString()?.trim() ?: ""
                btnClearSearch.visibility = if (searchQuery.isNotEmpty()) View.VISIBLE else View.GONE
                filterChannels()
            }
            override fun afterTextChanged(s: Editable?) {}
        })
    }

    private fun setupCategories() {
        com.rsg.movies.ui.TvFocusHelper.attachHorizontalRowFocus(
            recyclerView = rvCategories,
            onLeftAtStart = { com.rsg.movies.ui.TvFocusHelper.focusSidebar(activity) },
            upTarget = etSearch,
            downTarget = rvGrid
        )

        catAdapter = GenreChipAdapter(categoriesList, 0) { genre, _ ->
            activeCategory = genre.id
            filterChannels()
        }
        rvCategories.adapter = catAdapter
    }

    private fun setupGrid() {
        com.rsg.movies.ui.TvFocusHelper.attachGridFocus(rvGrid, 5) {
            com.rsg.movies.ui.TvFocusHelper.focusSidebar(activity)
        }

        rvGrid.addOnChildAttachStateChangeListener(object : RecyclerView.OnChildAttachStateChangeListener {
            override fun onChildViewAttachedToWindow(view: View) {
                view.setOnKeyListener { v, keyCode, event ->
                    if (event.action == android.view.KeyEvent.ACTION_DOWN) {
                        val pos = rvGrid.getChildAdapterPosition(v)
                        if (keyCode == android.view.KeyEvent.KEYCODE_DPAD_UP && pos in 0..4) {
                            if (rvCategories.visibility == View.VISIBLE) {
                                rvCategories.requestFocus()
                            } else {
                                etSearch.requestFocus()
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

        gridAdapter = LiveTvCardAdapter(
            items = displayedChannels,
            onItemClick = { channel ->
                val streamUrl = channel.url ?: ""
                if (streamUrl.isNotBlank()) {
                    val intent = Intent(requireContext(), PlayerActivity::class.java).apply {
                        putExtra("STREAM_URL", streamUrl)
                        putExtra("VIDEO_URL", streamUrl)
                        putExtra("MEDIA_TITLE", channel.getDisplayName())
                    }
                    startActivity(intent)
                } else {
                    Toast.makeText(requireContext(), "Stream URL unavailable for this channel", Toast.LENGTH_SHORT).show()
                }
            },
            onItemLongClick = { channel ->
                showChannelActionDialog(channel)
            }
        )
        rvGrid.adapter = gridAdapter
    }

    private fun showChannelActionDialog(channel: LiveTvChannel) {
        val context = requireContext()
        val isFav = LiveTvFavoritesManager.isFavorite(context, channel.id)
        val favOption = if (isFav) "★ Remove from Favorites" else "★ Add to Favorites"
        val options = arrayOf(
            favOption,
            "▶ Open in VLC Player",
            "▶ Open in MX Player"
        )

        AlertDialog.Builder(context, android.R.style.Theme_DeviceDefault_Dialog_Alert)
            .setTitle(channel.getDisplayName())
            .setItems(options) { dialog, which ->
                when (which) {
                    0 -> {
                        val nowFav = LiveTvFavoritesManager.toggleFavorite(context, channel.id)
                        val msg = if (nowFav) "Added ${channel.getDisplayName()} to Favorites" else "Removed from Favorites"
                        Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
                        filterChannels()
                    }
                    1 -> {
                        openInVlc(channel.url ?: "")
                    }
                    2 -> {
                        openInMxPlayer(channel.url ?: "")
                    }
                }
                dialog.dismiss()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun openInVlc(streamUrl: String) {
        if (streamUrl.isBlank()) {
            Toast.makeText(requireContext(), "Stream URL is not available", Toast.LENGTH_SHORT).show()
            return
        }
        try {
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(Uri.parse(streamUrl), "video/*")
                setPackage("org.videolan.vlc")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            startActivity(intent)
        } catch (_: Exception) {
            try {
                val genericIntent = Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(Uri.parse(streamUrl), "video/*")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                startActivity(genericIntent)
            } catch (_: Exception) {
                Toast.makeText(requireContext(), "VLC Player not installed on this device", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun openInMxPlayer(streamUrl: String) {
        if (streamUrl.isBlank()) {
            Toast.makeText(requireContext(), "Stream URL is not available", Toast.LENGTH_SHORT).show()
            return
        }
        val packages = listOf("com.mxtech.videoplayer.ad", "com.mxtech.videoplayer.pro")
        var launched = false
        for (pkg in packages) {
            try {
                val intent = Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(Uri.parse(streamUrl), "video/*")
                    setPackage(pkg)
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                startActivity(intent)
                launched = true
                break
            } catch (_: Exception) {}
        }
        if (!launched) {
            try {
                val genericIntent = Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(Uri.parse(streamUrl), "video/*")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                startActivity(genericIntent)
            } catch (_: Exception) {
                Toast.makeText(requireContext(), "MX Player not installed on this device", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun loadChannels() {
        val cacheKey = "livetv_channels_all"
        val cached = com.rsg.movies.providers.ContentCache.get<List<LiveTvChannel>>(cacheKey)
        if (!cached.isNullOrEmpty()) {
            pbLoading.visibility = View.GONE
            allLoadedChannels.clear()
            allLoadedChannels.addAll(cached)
            filterChannels()
            rvGrid.visibility = View.VISIBLE
            return
        }

        pbLoading.visibility = View.VISIBLE
        tvEmpty.visibility = View.GONE

        lifecycleScope.launch {
            try {
                val resp = ApiClient.scrapersApi.getLiveTvChannels(category = "")

                pbLoading.visibility = View.GONE
                if (resp.isSuccessful && !resp.body()?.channels.isNullOrEmpty()) {
                    val body = resp.body()!!
                    val channels = body.channels ?: emptyList()

                    val remoteCats = body.categories
                    if (!remoteCats.isNullOrEmpty()) {
                        val newCats = mutableListOf<Genre>()
                        newCats.add(Genre(rawId = "All", name = "All Channels"))
                        newCats.add(Genre(rawId = "Favorites", name = "★ Favorites"))
                        for (cat in remoteCats) {
                            if (!cat.equals("All", ignoreCase = true) && !cat.equals("Favorites", ignoreCase = true)) {
                                newCats.add(Genre(rawId = cat, name = cat))
                            }
                        }
                        categoriesList.clear()
                        categoriesList.addAll(newCats)
                        catAdapter.notifyDataSetChanged()
                    }

                    allLoadedChannels.clear()
                    allLoadedChannels.addAll(channels)
                    com.rsg.movies.providers.ContentCache.put(cacheKey, allLoadedChannels)
                    filterChannels()
                    rvGrid.visibility = View.VISIBLE
                } else {
                    allLoadedChannels.clear()
                    filterChannels()
                    tvEmpty.visibility = View.VISIBLE
                }
            } catch (e: Exception) {
                pbLoading.visibility = View.GONE
                tvEmpty.text = "Failed to load Live TV: ${e.localizedMessage}"
                tvEmpty.visibility = View.VISIBLE
            }
        }
    }

    private fun filterChannels() {
        displayedChannels.clear()
        val query = searchQuery.lowercase().trim()
        val context = context

        val filtered = allLoadedChannels.filter { channel ->
            val matchesCategory = when (activeCategory) {
                "All" -> true
                "Favorites" -> context != null && LiveTvFavoritesManager.isFavorite(context, channel.id)
                else -> channel.category?.equals(activeCategory, ignoreCase = true) == true
            }

            val matchesSearch = if (query.isEmpty()) {
                true
            } else {
                channel.getDisplayName().lowercase().contains(query) ||
                    (channel.category?.lowercase()?.contains(query) == true)
            }

            matchesCategory && matchesSearch
        }

        displayedChannels.addAll(filtered)
        gridAdapter.notifyDataSetChanged()

        if (displayedChannels.isEmpty()) {
            tvEmpty.visibility = View.VISIBLE
            if (activeCategory == "Favorites") {
                tvEmpty.text = "No favorite channels yet. Long-press any channel to add it to Favorites!"
            } else if (query.isNotEmpty()) {
                tvEmpty.text = "No channels found matching \"$searchQuery\""
            } else {
                tvEmpty.text = "No channels available in $activeCategory"
            }
            rvGrid.visibility = View.GONE
        } else {
            tvEmpty.visibility = View.GONE
            rvGrid.visibility = View.VISIBLE
        }
    }
}
