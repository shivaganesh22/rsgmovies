package com.rsg.movies.ui.viewall

import android.os.Bundle
import android.util.TypedValue
import android.view.View
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.rsg.movies.R
import com.rsg.movies.data.model.MediaItem
import com.rsg.movies.providers.ContentProviderFactory
import com.rsg.movies.ui.adapters.GridSpacingItemDecoration
import com.rsg.movies.ui.adapters.ModernMediaCardAdapter
import kotlinx.coroutines.launch

class ViewAllActivity : FragmentActivity() {

    private var category: String = ""
    private var titleText: String = "View All"
    private var isEpisode: Boolean = false

    private lateinit var tvTitle: TextView
    private lateinit var rvGrid: RecyclerView
    private lateinit var pbLoading: ProgressBar

    private val mediaItems = mutableListOf<MediaItem>()
    private lateinit var mediaAdapter: ModernMediaCardAdapter
    private var currentPage = 1
    private var isLoading = false
    private var hasMorePages = true

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_view_all_modern)

        category = intent.getStringExtra("CATEGORY") ?: intent.getStringExtra("ENDPOINT_PATH") ?: ""
        titleText = intent.getStringExtra("TITLE") ?: "View All"
        isEpisode = intent.getBooleanExtra("IS_EPISODE", false) || category.contains("episode", true)

        tvTitle = findViewById(R.id.tv_view_all_title)
        rvGrid = findViewById(R.id.rv_view_all_grid)
        pbLoading = findViewById(R.id.pb_view_all_loading)

        tvTitle.text = titleText

        // 4 columns for episodes, 6 columns for posters matching Screenshots 3 & 7
        val spanCount = if (isEpisode) 4 else 6

        val spacingPx = TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP, 8f, resources.displayMetrics
        ).toInt()
        rvGrid.addItemDecoration(GridSpacingItemDecoration(spanCount, spacingPx, true))

        com.rsg.movies.ui.TvFocusHelper.attachGridFocus(rvGrid, spanCount)

        mediaAdapter = ModernMediaCardAdapter(mediaItems, isEpisodeRow = isEpisode)
        rvGrid.adapter = mediaAdapter

        rvGrid.addOnScrollListener(object : RecyclerView.OnScrollListener() {
            override fun onScrolled(recyclerView: RecyclerView, dx: Int, dy: Int) {
                super.onScrolled(recyclerView, dx, dy)
                val lm = recyclerView.layoutManager as? androidx.recyclerview.widget.LinearLayoutManager ?: return
                val total = lm.itemCount
                val last = lm.findLastVisibleItemPosition()
                if (!isLoading && hasMorePages && total <= (last + 6)) {
                    loadPage()
                }
            }
        })

        loadPage()
    }

    private fun loadPage() {
        if (isLoading || !hasMorePages) return
        isLoading = true

        if (currentPage == 1) {
            pbLoading.visibility = View.VISIBLE
        }

        lifecycleScope.launch {
            try {
                val provider = ContentProviderFactory.create()
                val resp = provider.getCategoryItems(category, currentPage)

                pbLoading.visibility = View.GONE
                val items = resp?.data
                if (!items.isNullOrEmpty()) {
                    val startPos = mediaItems.size
                    mediaItems.addAll(items)
                    mediaAdapter.notifyItemRangeInserted(startPos, items.size)
                    currentPage++
                    hasMorePages = resp.hasMorePages()
                } else {
                    hasMorePages = false
                }
            } catch (e: Exception) {
                pbLoading.visibility = View.GONE
                Toast.makeText(this@ViewAllActivity, "Failed to load: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            } finally {
                isLoading = false
            }
        }
    }
}