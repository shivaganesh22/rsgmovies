package com.rsg.movies.ui.moviebox

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.KeyEvent
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
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
import com.rsg.movies.data.api.ApiClient
import com.rsg.movies.data.model.MovieboxBannerItem
import com.rsg.movies.data.model.MovieboxOperatingItem
import com.rsg.movies.data.model.MovieboxSubjectItem
import com.rsg.movies.ui.adapters.MovieboxCategorySection
import com.rsg.movies.ui.adapters.MovieboxSectionAdapter
import kotlinx.coroutines.launch

class ModernMovieboxScreenFragment : Fragment() {

    private lateinit var rvMovieboxSections: RecyclerView
    private lateinit var pbLoading: ProgressBar
    private lateinit var llError: LinearLayout
    private lateinit var btnRetry: Button

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

    private var bannerItems = listOf<MovieboxBannerItem>()
    private var currentHeroIndex = 0
    private val heroAutoHandler = Handler(Looper.getMainLooper())
    private val heroAutoRunnable = Runnable {
        if (bannerItems.isNotEmpty()) {
            currentHeroIndex = (currentHeroIndex + 1) % bannerItems.size
            displayHeroItem(currentHeroIndex)
            scheduleHeroAuto()
        }
    }

    private data class CategoryDef(
        val key: String,
        val position: Int,
        val altPositions: List<Int> = emptyList(),
        val title: String,
        val fallback: String
    )

    private val categoryDefinitions = listOf(
        CategoryDef("trending", 15, emptyList(), "Trending Now", "trending"),
        CategoryDef("south_indian", 120, emptyList(), "South Indian", "south indian"),
        CategoryDef("cinema", 100, emptyList(), "Cinema", "cinema"),
        CategoryDef("bollywood", 110, emptyList(), "Bollywood", "bollywood"),
        CategoryDef("indian_drama", 150, emptyList(), "Indian Drama", "indian drama"),
        CategoryDef("hollywood", 130, emptyList(), "Hollywood", "hollywood"),
        CategoryDef("anime", 160, emptyList(), "Top Anime", "anime"),
        CategoryDef("asian_series", 170, emptyList(), "Best Asian Series", "asian series"),
        CategoryDef("western_tv", 230, listOf(180), "Western TV", "western"),
        CategoryDef("free_now", 17, emptyList(), "Free Now", "free now"),
        CategoryDef("coming_soon", 30, emptyList(), "Coming Soon", "coming soon")
    )

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.fragment_moviebox_modern, container, false)

        rvMovieboxSections = view.findViewById(R.id.rv_moviebox_sections)
        pbLoading = view.findViewById(R.id.pb_moviebox_loading)
        llError = view.findViewById(R.id.ll_moviebox_error)
        btnRetry = view.findViewById(R.id.btn_moviebox_retry)

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

        rvMovieboxSections.layoutManager = LinearLayoutManager(requireContext())

        setupHeroNavigation()
        btnRetry.setOnClickListener { loadMovieboxData() }

        loadMovieboxData()

        return view
    }

    private fun setupHeroNavigation() {
        heroContainer.setOnKeyListener { _, keyCode, event ->
            if (event.action == KeyEvent.ACTION_DOWN) {
                if (keyCode == KeyEvent.KEYCODE_DPAD_RIGHT) {
                    if (bannerItems.isNotEmpty() && currentHeroIndex < bannerItems.size - 1) {
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
            if (bannerItems.isNotEmpty() && currentHeroIndex in bannerItems.indices) {
                val banner = bannerItems[currentHeroIndex]
                val subId = banner.subjectId ?: banner.subject?.subjectId
                if (!subId.isNullOrBlank()) {
                    openDetail(subId)
                }
            }
        }
    }

    private fun loadMovieboxData() {
        pbLoading.visibility = View.VISIBLE
        llError.visibility = View.GONE

        lifecycleScope.launch {
            try {
                val resp = ApiClient.movieboxApi.getHome()
                pbLoading.visibility = View.GONE
                if (resp.isSuccessful && resp.body()?.data != null) {
                    val operatingList = resp.body()!!.data!!.operatingList ?: emptyList()
                    bindMovieboxHome(operatingList)
                } else {
                    showError()
                }
            } catch (e: Exception) {
                pbLoading.visibility = View.GONE
                showError()
            }
        }
    }

    private fun showError() {
        llError.visibility = View.VISIBLE
        btnRetry.requestFocus()
    }

    private fun bindMovieboxHome(operatingList: List<MovieboxOperatingItem>) {
        // 1. Extract Banner Block
        val bannerBlock = operatingList.find {
            it.position == 1 || it.type.equals("BANNER", true) || !it.banner?.items.isNullOrEmpty()
        }
        val rawBanners = bannerBlock?.banner?.items ?: emptyList()
        bannerItems = rawBanners.filter { !it.subjectId.isNullOrBlank() || it.subject != null }

        if (bannerItems.isNotEmpty()) {
            heroContainer.visibility = View.VISIBLE
            buildHeroDots(bannerItems.size)
            currentHeroIndex = 0
            displayHeroItem(0)
            scheduleHeroAuto()
        } else {
            heroContainer.visibility = View.GONE
        }

        // 2. Map Categories in requested order
        val sections = mutableListOf<MovieboxCategorySection>()
        for (def in categoryDefinitions) {
            val matched = operatingList.find { item ->
                if (item.position == def.position) return@find true
                if (def.altPositions.contains(item.position)) return@find true
                val t = (item.title ?: "").lowercase()
                t.contains(def.fallback)
            }

            val subjects = matched?.subjects?.filter { !it.title.isNullOrBlank() }
            if (!subjects.isNullOrEmpty()) {
                sections.add(MovieboxCategorySection(title = def.title, items = subjects))
            }
        }

        // Add any remaining categories with subjects
        for (item in operatingList) {
            val title = item.title ?: ""
            if (title.isBlank() || title.equals("IN Banner", true) || item.type.equals("BANNER", true)) continue
            if (sections.any { it.title.equals(title, true) }) continue
            val subjects = item.subjects?.filter { !it.title.isNullOrBlank() }
            if (!subjects.isNullOrEmpty()) {
                sections.add(MovieboxCategorySection(title = title, items = subjects))
            }
        }

        val adapter = MovieboxSectionAdapter(
            sections = sections,
            onUpOnTopRow = {
                if (heroContainer.visibility == View.VISIBLE) {
                    heroContainer.requestFocus()
                }
            },
            onItemClick = { subject ->
                val id = subject.subjectId
                if (!id.isNullOrBlank()) {
                    openDetail(id)
                }
            }
        )

        rvMovieboxSections.adapter = adapter
    }

    private fun displayHeroItem(index: Int) {
        if (index !in bannerItems.indices) return
        val banner = bannerItems[index]
        val subject = banner.subject

        val rawTitle = banner.title ?: subject?.title ?: "Featured"
        val cleanTitle = rawTitle.replace(Regex("""\[.*?\]"""), "").trim().ifEmpty { rawTitle }
        tvHeroTitle.text = cleanTitle

        val rating = subject?.getRating() ?: 0.0
        if (rating > 0.0) {
            llHeroRating.visibility = View.VISIBLE
            tvHeroRating.text = String.format("%.1f", rating)
        } else {
            llHeroRating.visibility = View.GONE
        }

        val year = subject?.getDisplayYear() ?: ""
        tvHeroYear.text = year
        tvHeroYear.visibility = if (year.isNotBlank()) View.VISIBLE else View.GONE

        val genre = subject?.genre ?: (if (subject?.isSeries() == true) "SERIES" else "MOVIE")
        tvHeroGenre.text = genre

        val overview = subject?.description ?: ""
        tvHeroOverview.text = overview
        tvHeroOverview.visibility = if (overview.isNotBlank()) View.VISIBLE else View.GONE

        tvHeroBadge.text = if (subject?.isSeries() == true) "SERIES" else "MOVIE"

        val backdropUrl = banner.image?.url?.ifBlank { null }
            ?: subject?.getCoverUrl()?.ifBlank { null }
        val posterUrl = subject?.getCoverUrl()?.ifBlank { null }
            ?: banner.image?.url?.ifBlank { null }

        Glide.with(this)
            .load(backdropUrl)
            .placeholder(R.drawable.ic_placeholder)
            .error(R.drawable.ic_placeholder)
            .into(ivHeroBackdrop)

        Glide.with(this)
            .load(posterUrl)
            .placeholder(R.drawable.ic_placeholder)
            .error(R.drawable.ic_placeholder)
            .into(ivHeroPoster)

        updateHeroDots(index)
    }

    private fun buildHeroDots(count: Int) {
        updateHeroDots(currentHeroIndex)
    }

    private fun updateHeroDots(selectedIndex: Int) {
        llHeroDots.removeAllViews()
        if (bannerItems.size > 1) {
            val count = bannerItems.size.coerceAtMost(10)
            for (i in 0 until count) {
                val dot = View(requireContext()).apply {
                    val size = if (i == selectedIndex) 18 else 8
                    layoutParams = LinearLayout.LayoutParams(
                        (size * resources.displayMetrics.density).toInt(),
                        (6 * resources.displayMetrics.density).toInt()
                    ).apply {
                        setMargins(4, 0, 4, 0)
                    }
                    setBackgroundResource(if (i == selectedIndex) R.drawable.badge_bg else R.drawable.card_rounded_bg)
                }
                llHeroDots.addView(dot)
            }
        }
    }

    private fun scheduleHeroAuto() {
        heroAutoHandler.removeCallbacks(heroAutoRunnable)
        heroAutoHandler.postDelayed(heroAutoRunnable, 7000)
    }

    private fun focusFirstCategoryItem() {
        val vh = rvMovieboxSections.findViewHolderForAdapterPosition(0)
        if (vh is MovieboxSectionAdapter.SectionViewHolder) {
            vh.rvItems.post {
                val firstCard = vh.rvItems.layoutManager?.findViewByPosition(0)
                if (firstCard != null) {
                    firstCard.requestFocus()
                } else {
                    vh.rvItems.requestFocus()
                }
            }
        }
    }

    private fun openDetail(subjectId: String) {
        val intent = Intent(requireContext(), MovieboxDetailActivity::class.java).apply {
            putExtra("SUBJECT_ID", subjectId)
        }
        startActivity(intent)
    }

    override fun onResume() {
        super.onResume()
        if (bannerItems.isNotEmpty()) {
            scheduleHeroAuto()
        }
    }

    override fun onPause() {
        super.onPause()
        heroAutoHandler.removeCallbacks(heroAutoRunnable)
    }
}
