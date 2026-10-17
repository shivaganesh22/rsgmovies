package com.rsg.movies.ui.home

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.KeyEvent
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.rsg.movies.R
import com.rsg.movies.data.model.MediaItem
import com.rsg.movies.providers.ContentProviderFactory
import com.rsg.movies.ui.adapters.HomeSection
import com.rsg.movies.ui.adapters.ModernHomeSectionAdapter
import com.rsg.movies.ui.details.DetailsActivity
import kotlinx.coroutines.launch

class ModernHomeScreenFragment : Fragment() {

    private lateinit var rvHomeSections: RecyclerView
    private lateinit var pbLoading: ProgressBar
    private lateinit var heroContainer: View
    private lateinit var ivHeroBackdrop: ImageView
    private lateinit var ivHeroPoster: ImageView
    private lateinit var tvHeroBadge: TextView
    private lateinit var llHeroRating: LinearLayout
    private lateinit var tvHeroRating: TextView
    private lateinit var tvHeroTitle: TextView
    private lateinit var tvHeroYear: TextView
    private lateinit var tvHeroGenre: TextView
    private lateinit var tvHeroOverview: TextView
    private lateinit var llHeroDots: LinearLayout

    private var featuredItems = listOf<MediaItem>()
    private var currentHeroIndex = 0
    private val heroAutoHandler = Handler(Looper.getMainLooper())
    private val heroAutoRunnable = Runnable {
        if (featuredItems.isNotEmpty()) {
            currentHeroIndex = (currentHeroIndex + 1) % featuredItems.size
            displayHeroItem(currentHeroIndex)
            scheduleHeroAuto()
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.fragment_home_modern, container, false)

        rvHomeSections = view.findViewById(R.id.rv_home_sections)
        pbLoading = view.findViewById(R.id.pb_home_loading)
        heroContainer = view.findViewById(R.id.hero_banner)
        ivHeroBackdrop = view.findViewById(R.id.iv_hero_backdrop)
        ivHeroPoster = view.findViewById(R.id.iv_hero_poster)
        tvHeroBadge = view.findViewById(R.id.tv_hero_badge)
        llHeroRating = view.findViewById(R.id.ll_hero_rating)
        tvHeroRating = view.findViewById(R.id.tv_hero_rating)
        tvHeroTitle = view.findViewById(R.id.tv_hero_title)
        tvHeroYear = view.findViewById(R.id.tv_hero_year)
        tvHeroGenre = view.findViewById(R.id.tv_hero_genre)
        tvHeroOverview = view.findViewById(R.id.tv_hero_overview)
        llHeroDots = view.findViewById(R.id.ll_hero_dots)

        rvHomeSections.layoutManager = LinearLayoutManager(requireContext())

        setupHeroNavigation()
        loadHomeData()

        return view
    }

    private fun setupHeroNavigation() {
        heroContainer.setOnKeyListener { _, keyCode, event ->
            if (event.action == KeyEvent.ACTION_DOWN) {
                if (keyCode == KeyEvent.KEYCODE_DPAD_RIGHT) {
                    if (featuredItems.isNotEmpty() && currentHeroIndex < featuredItems.size - 1) {
                        currentHeroIndex++
                        displayHeroItem(currentHeroIndex)
                        scheduleHeroAuto()
                    }
                    return@setOnKeyListener true
                } else if (keyCode == KeyEvent.KEYCODE_DPAD_LEFT) {
                    if (currentHeroIndex == 0) {
                        com.rsg.movies.ui.TvFocusHelper.focusSidebar(activity, heroContainer)
                        return@setOnKeyListener true
                    } else if (currentHeroIndex > 0) {
                        currentHeroIndex--
                        displayHeroItem(currentHeroIndex)
                        scheduleHeroAuto()
                        return@setOnKeyListener true
                    }
                } else if (keyCode == KeyEvent.KEYCODE_DPAD_DOWN) {
                    focusFirstCategoryItem()
                    return@setOnKeyListener true
                }
            }
            false
        }

        heroContainer.setOnClickListener {
            if (featuredItems.isNotEmpty() && currentHeroIndex in featuredItems.indices) {
                val item = featuredItems[currentHeroIndex]
                val intent = Intent(requireContext(), DetailsActivity::class.java).apply {
                    val mediaId = (item.featuredId ?: item.id).toString()
                    putExtra("MEDIA_ID", mediaId)
                    val type = item.type ?: ""
                    val isSeries = type.equals("serie", true) || type.equals("series", true) || type.equals("episode", true) || item.seasonNumber != null || item.episodeNumber != null
                    putExtra("MEDIA_TYPE", if (isSeries) "serie" else "movie")
                }
                startActivity(intent)
            }
        }
    }

    private fun focusFirstCategoryItem() {
        if (rvHomeSections.adapter != null && (rvHomeSections.adapter?.itemCount ?: 0) > 0) {
            rvHomeSections.smoothScrollToPosition(0)
            rvHomeSections.postDelayed({
                val firstRowHolder = rvHomeSections.findViewHolderForAdapterPosition(0) as? ModernHomeSectionAdapter.SectionViewHolder
                if (firstRowHolder != null) {
                    val subRv = firstRowHolder.rvItems
                    subRv.smoothScrollToPosition(0)
                    subRv.postDelayed({
                        val firstCard = subRv.findViewHolderForAdapterPosition(0)?.itemView
                        if (firstCard != null) {
                            firstCard.requestFocus()
                        } else {
                            subRv.requestFocus()
                        }
                    }, 50)
                }
            }, 50)
        }
    }

    private fun scheduleHeroAuto() {
        heroAutoHandler.removeCallbacks(heroAutoRunnable)
        heroAutoHandler.postDelayed(heroAutoRunnable, 6000)
    }

    private fun loadHomeData() {
        pbLoading.visibility = View.VISIBLE

        lifecycleScope.launch {
            try {
                val provider = ContentProviderFactory.create()
                val homeData = provider.getHome()

                pbLoading.visibility = View.GONE
                if (homeData != null) {
                    val featured = homeData.featured ?: homeData.pinned ?: emptyList()
                    if (featured.isNotEmpty()) {
                        featuredItems = featured
                        heroContainer.visibility = View.VISIBLE
                        displayHeroItem(0)
                        scheduleHeroAuto()
                        heroContainer.post { heroContainer.requestFocus() }
                    } else {
                        heroContainer.visibility = View.GONE
                    }

                    val sections = mutableListOf<HomeSection>()

                    // 1. Pinned Content
                    homeData.pinned?.let {
                        if (it.isNotEmpty()) sections.add(HomeSection("📌 Pinned Content", it, "pinned", false))
                    }
                    // 2. New HD Released
                    homeData.rvcontent?.forEach { (name, list) ->
                        if (!list.isNullOrEmpty()) sections.add(HomeSection("💎 $name", list, "new_hd", false))
                    }
                    // 3. Latest Movies
                    homeData.latestMovies?.let {
                        if (it.isNotEmpty()) sections.add(HomeSection("🎬 Latest Movies", it, "latest_movies", false))
                    }
                    // 4. Latest Episodes
                    homeData.latestEpisodes?.let {
                        if (it.isNotEmpty()) sections.add(HomeSection("📺 Latest Episodes", it, "latest_episodes", true))
                    }
                    // 5. Recommended For You
                    homeData.recommended?.let {
                        if (it.isNotEmpty()) sections.add(HomeSection("⭐ Recommended For You", it, "recommended", false))
                    }
                    // 6. Trending Now
                    homeData.trending?.let {
                        if (it.isNotEmpty()) sections.add(HomeSection("🔥 Trending Now", it, "trending", false))
                    }
                    // 7. Choosed For You
                    homeData.choosed?.let {
                        if (it.isNotEmpty()) sections.add(HomeSection("✨ Choosed For You", it, "choosed", false))
                    }
                    // 8. Popular Series
                    homeData.popularSeries?.let {
                        if (it.isNotEmpty()) sections.add(HomeSection("🍿 Popular Series", it, "popular_series", false))
                    }
                    // 9. Recently Added
                    homeData.recentlyAdded?.let {
                        if (it.isNotEmpty()) sections.add(HomeSection("🆕 Recently Added", it, "recently_added", false))
                    }
                    // 10. Latest Series
                    homeData.latestSeries?.let {
                        if (it.isNotEmpty()) sections.add(HomeSection("📺 Latest Series", it, "latest_series", false))
                    }
                    // 11. New This Week
                    homeData.thisWeek?.let {
                        if (it.isNotEmpty()) sections.add(HomeSection("📅 New This Week", it, "next_this_week", false))
                    }
                    // 12. Most Popular
                    homeData.mostPopular?.let {
                        if (it.isNotEmpty()) sections.add(HomeSection("🌟 Most Popular", it, "most_popular", false))
                    }

                    rvHomeSections.adapter = ModernHomeSectionAdapter(
                        sections,
                        onUpOnTopRow = { heroContainer.requestFocus() }
                    )

                    if (featured.isEmpty()) {
                        focusFirstCategoryItem()
                    }
                }
            } catch (_: Exception) {
                pbLoading.visibility = View.GONE
            }
        }
    }

    private fun displayHeroItem(index: Int) {
        if (index !in featuredItems.indices) return
        val heroItem = featuredItems[index]

        val title = heroItem.title ?: "RSG Movies"
        tvHeroTitle.text = title

        val releaseDate = heroItem.releaseDate ?: ""
        val year = if (releaseDate.length >= 4) releaseDate.substring(0, 4) else releaseDate
        tvHeroYear.text = if (year.isNotBlank()) year else "2026"

        val genre = heroItem.genre ?: "Action"
        tvHeroGenre.text = genre

        val overview = heroItem.overview ?: "Stream this featured title now on RSG Movies TV."
        tvHeroOverview.text = overview

        val rating = heroItem.voteAverage
        if (rating != null && rating > 0.0) {
            llHeroRating.visibility = View.VISIBLE
            tvHeroRating.text = String.format("%.1f", rating)
        } else {
            llHeroRating.visibility = View.GONE
        }

        val quality = heroItem.quality ?: heroItem.subtitle ?: "HD"
        tvHeroBadge.text = quality

        // Backdrop
        val backdropUrl = heroItem.backdropPathTv ?: heroItem.backdropPath ?: heroItem.posterPath ?: ""
        Glide.with(this)
            .load(backdropUrl)
            .placeholder(R.drawable.ic_placeholder)
            .error(R.drawable.ic_placeholder)
            .into(ivHeroBackdrop)

        // 2:3 Poster Card
        val posterUrl = heroItem.posterPath ?: heroItem.backdropPath ?: ""
        Glide.with(this)
            .load(posterUrl)
            .placeholder(R.drawable.ic_placeholder)
            .error(R.drawable.ic_placeholder)
            .into(ivHeroPoster)

        // Slide Indicator Dots
        llHeroDots.removeAllViews()
        if (featuredItems.size > 1) {
            for (i in featuredItems.indices) {
                val dot = View(requireContext()).apply {
                    val size = if (i == index) 18 else 8
                    layoutParams = LinearLayout.LayoutParams(
                        (size * resources.displayMetrics.density).toInt(),
                        (6 * resources.displayMetrics.density).toInt()
                    ).apply {
                        setMargins(4, 0, 4, 0)
                    }
                    setBackgroundResource(if (i == index) R.drawable.badge_bg else R.drawable.card_rounded_bg)
                }
                llHeroDots.addView(dot)
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        heroAutoHandler.removeCallbacks(heroAutoRunnable)
    }
}
