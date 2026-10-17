package com.rsg.movies.ui.home

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.View
import androidx.leanback.app.BackgroundManager
import androidx.leanback.app.BrowseSupportFragment
import androidx.leanback.app.RowsSupportFragment
import androidx.leanback.widget.*
import androidx.lifecycle.ViewModelProvider
import com.rsg.movies.data.model.MediaItem
import com.rsg.movies.ui.details.DetailsActivity
import com.rsg.movies.ui.presenters.EpisodeCardPresenter
import com.rsg.movies.ui.presenters.HeroPresenter
import com.rsg.movies.ui.presenters.HeroRow
import com.rsg.movies.ui.presenters.MovieCardPresenter
import com.rsg.movies.ui.presenters.ViewAllPresenter
import com.rsg.movies.ui.viewall.ViewAllActivity

class HomeFragment : RowsSupportFragment(),
    BrowseSupportFragment.MainFragmentAdapterProvider {

    // Required by BrowseSupportFragment when hosting a RowsSupportFragment as a PageRow fragment
    private val mMainFragmentAdapter = BrowseSupportFragment.MainFragmentAdapter(this)
    override fun getMainFragmentAdapter(): BrowseSupportFragment.MainFragmentAdapter<*> =
        mMainFragmentAdapter

    private lateinit var viewModel: HomeViewModel
    private lateinit var rowsAdapter: ArrayObjectAdapter

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        // ── Background ────────────────────────────────────────────────────────
        val backgroundManager = BackgroundManager.getInstance(requireActivity())
        if (!backgroundManager.isAttached) {
            backgroundManager.attach(requireActivity().window)
        }
        backgroundManager.color = Color.parseColor("#0F172A")

        // ── Row alignment: cursor stays centred, rows scroll behind it ────────
        // We target the RowsSupportFragment's own VerticalGridView via its
        // public API — no removed verticalGridView shortcut needed.
        mainFragmentAdapter.fragmentHost?.notifyDataReady(mainFragmentAdapter)
        view.post {
            // RowsSupportFragment exposes its grid through getVerticalGridView()
            val grid = verticalGridView
            grid?.apply {
                windowAlignment = BaseGridView.WINDOW_ALIGN_NO_EDGE
                windowAlignmentOffsetPercent = 50f
                windowAlignmentOffset = 0
                itemAlignmentOffsetPercent = 50f
                isItemAlignmentOffsetWithPadding = true
            }
        }

        // ── Adapters ──────────────────────────────────────────────────────────
        val presenterSelector = ClassPresenterSelector()
        presenterSelector.addClassPresenter(HeroRow::class.java, HeroPresenter())
        presenterSelector.addClassPresenter(ListRow::class.java, ListRowPresenter())

        rowsAdapter = ArrayObjectAdapter(presenterSelector)
        adapter = rowsAdapter

        // ── ViewModel ─────────────────────────────────────────────────────────
        viewModel = ViewModelProvider(this)[HomeViewModel::class.java]
        viewModel.homeData.observe(viewLifecycleOwner) { homeResponse ->
            if (homeResponse != null) populateUI(homeResponse)
        }
        viewModel.fetchInitialData()

        setupEventListeners()
    }

    private fun populateUI(data: com.rsg.movies.data.model.HomeResponse) {
        rowsAdapter.clear()

        val sliderList = if (!data.featured.isNullOrEmpty()) data.featured else data.trending
        if (!sliderList.isNullOrEmpty()) {
            rowsAdapter.add(HeroRow(sliderList.take(5)))
        }

        val moviePresenter = MovieCardPresenter()
        val episodePresenter = EpisodeCardPresenter()
        val viewAllPresenter = ViewAllPresenter()

        fun addRow(
            title: String,
            items: List<MediaItem>?,
            defaultPresenter: Presenter,
            apiPath: String
        ) {
            if (!items.isNullOrEmpty()) {
                val cardSelector = object : PresenterSelector() {
                    override fun getPresenter(item: Any?): Presenter {
                        val mediaItem = item as? MediaItem
                        return if (mediaItem?.type?.startsWith("view_all||") == true)
                            viewAllPresenter
                        else
                            defaultPresenter
                    }
                }
                val rowAdapter = ArrayObjectAdapter(cardSelector)
                rowAdapter.addAll(0, items)

                if (items.size >= 8) {
                    val viewAllDummy = MediaItem(
                        id = -1, featuredId = null, title = "View All",
                        posterPath = null, backdropPath = null, backdropPathTv = null,
                        stillPath = null, overview = null, releaseDate = null,
                        voteAverage = null, type = "view_all||$apiPath||$title",
                        quality = null, subtitle = null, newEpisodes = null,
                        genre = null, seasonNumber = null, episodeNumber = null,
                        episodeName = null
                    )
                    rowAdapter.add(viewAllDummy)
                }
                rowsAdapter.add(ListRow(HeaderItem(title), rowAdapter))
            }
        }

        addRow("Pinned Content",         data.pinned,                        moviePresenter,   "genres/pinned/all")
        addRow("New HD Released",        data.rvcontent?.get("New HD Released"), moviePresenter, "genres/media/names/New%20HD%20Released")
        addRow("Latest Movies",          data.latestMovies,                  moviePresenter,   "genres/latestmovies/all")
        addRow("Latest Episodes",        data.latestEpisodes,                episodePresenter, "media/seriesEpisodesAll")
        addRow("Recommended For You",    data.recommended,                   moviePresenter,   "genres/recommended/all")
        addRow("Trending Now",           data.trending,                      moviePresenter,   "genres/trending/all")
        addRow("Choosed For You",        data.choosed,                       moviePresenter,   "genres/choosed/all")
        addRow("Popular Series",         data.popularSeries,                 moviePresenter,   "genres/popularseries/all")
        addRow("Recently Added",         data.recentlyAdded,                 moviePresenter,   "genres/new/all")
        addRow("Latest Series",          data.latestSeries,                  moviePresenter,   "genres/latestseries/all")
        addRow("New This Week",          data.thisWeek,                      moviePresenter,   "genres/thisweek/all")
        addRow("Most Popular",           data.mostPopular,                   moviePresenter,   "genres/popularmovies/all")
    }

    private fun setupEventListeners() {
        setOnItemViewClickedListener { _, item, _, _ ->
            val media = item as? MediaItem ?: return@setOnItemViewClickedListener

            if (media.type?.startsWith("view_all||") == true) {
                val parts = media.type!!.split("||")
                startActivity(Intent(requireContext(), ViewAllActivity::class.java).apply {
                    putExtra("ENDPOINT_PATH", parts[1])
                    putExtra("TITLE", parts[2])
                    putExtra(
                        "MEDIA_TYPE",
                        if (parts[2].contains("Series", true) ||
                            parts[2].contains("Episodes", true)
                        ) "serie" else "movie"
                    )
                })
            } else {
                startActivity(Intent(requireContext(), DetailsActivity::class.java).apply {
                    putExtra("MEDIA_ID", media.id.toString())
                    val type = media.type ?: ""
                    val isSeriesContent = type.equals("serie", true) ||
                            type.equals("episode", true) ||
                            media.seasonNumber != null ||
                            media.episodeNumber != null
                    putExtra("MEDIA_TYPE", if (isSeriesContent) "serie" else "movie")
                })
            }
        }
    }
}