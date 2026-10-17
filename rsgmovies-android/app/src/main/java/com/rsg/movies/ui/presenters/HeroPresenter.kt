package com.rsg.movies.ui.presenters

import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.view.KeyEvent
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.leanback.widget.Row
import androidx.leanback.widget.RowPresenter
import com.bumptech.glide.Glide
import com.bumptech.glide.load.resource.drawable.DrawableTransitionOptions
import com.rsg.movies.R
import com.rsg.movies.data.model.MediaItem
import com.rsg.movies.ui.details.DetailsActivity

// Passes the list of featured movies to the Row
class HeroRow(val movies: List<MediaItem>) : Row()

class HeroPresenter : RowPresenter() {

    init {
        // Hides Leanback's default row header for the Hero section
        headerPresenter = null
    }

    override fun createRowViewHolder(parent: ViewGroup): ViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_hero_slider, parent, false)
        return HeroViewHolder(view)
    }

    override fun onBindRowViewHolder(holder: ViewHolder, item: Any) {
        super.onBindRowViewHolder(holder, item)
        val heroRow = item as HeroRow
        val heroHolder = holder as HeroViewHolder
        heroHolder.bind(heroRow.movies)
    }

    // PREVENTS MEMORY LEAKS
    override fun onUnbindRowViewHolder(holder: ViewHolder) {
        super.onUnbindRowViewHolder(holder)
        val heroHolder = holder as HeroViewHolder
        heroHolder.stopTimer()
    }

    // Handles the sliding logic and UI mapping
    inner class HeroViewHolder(view: View) : ViewHolder(view) {
        private var movies: List<MediaItem> = emptyList()
        private var currentIndex = 0
        private val handler = Handler(Looper.getMainLooper())

        // UI Views
        private val title: TextView = view.findViewById(R.id.hero_title)
        private val overview: TextView = view.findViewById(R.id.hero_overview)
        private val backdrop: ImageView = view.findViewById(R.id.hero_backdrop)
        private val year: TextView = view.findViewById(R.id.hero_year)
        private val genre: TextView = view.findViewById(R.id.hero_genre)
        private val rating: TextView = view.findViewById(R.id.hero_rating)
        private val qualityBadge: TextView = view.findViewById(R.id.hero_hd)
        private val dotsContainer: LinearLayout = view.findViewById(R.id.dots_container)

        // 5-second Auto Slider
        private val slideRunnable = object : Runnable {
            override fun run() {
                if (movies.isNotEmpty()) {
                    currentIndex = (currentIndex + 1) % movies.size
                    updateUI()
                    handler.postDelayed(this, 5000)
                }
            }
        }

        fun bind(movieList: List<MediaItem>) {
            this.movies = movieList
            if (movies.isEmpty()) return

            setupDots()
            updateUI()

            // ==========================================
            // CLICK LISTENER FOR THE SLIDER
            // ==========================================
            view.setOnClickListener {
                val currentMovie = movies[currentIndex]

                // USE FEATURED_ID EXACTLY LIKE REACT (Fallback to normal id if null)
                val targetId = currentMovie.featuredId?.toString() ?: currentMovie.id.toString()

                val intent = Intent(it.context, DetailsActivity::class.java).apply {
                    putExtra("MEDIA_ID", targetId)

                    // Smart fallback logic to identify Series vs Movie
                    val type = currentMovie.type ?: ""
                    val isSeriesContent = type.equals("serie", true) || type.equals("episode", true) || currentMovie.seasonNumber != null || currentMovie.episodeNumber != null
                    putExtra("MEDIA_TYPE", if (isSeriesContent) "serie" else "movie")
                }
                it.context.startActivity(intent)
            }
            // ==========================================

            // D-Pad Left/Right Logic to change movies manually
            view.setOnKeyListener { _, keyCode, event ->
                if (event.action == KeyEvent.ACTION_DOWN) {
                    when (keyCode) {
                        KeyEvent.KEYCODE_DPAD_RIGHT -> {
                            resetTimer()
                            currentIndex = (currentIndex + 1) % movies.size
                            updateUI()
                            return@setOnKeyListener true
                        }
                        KeyEvent.KEYCODE_DPAD_LEFT -> {
                            if (currentIndex == 0) {
                                // We are on the first slide. Do NOT loop.
                                // Return false so the TV remote handles it and opens the Left Nav Bar.
                                return@setOnKeyListener false
                            }
                            resetTimer()
                            currentIndex--
                            updateUI()
                            return@setOnKeyListener true
                        }
                    }
                }
                false
            }

            // Start auto-slide only when the Hero banner is focused
            view.setOnFocusChangeListener { _, hasFocus ->
                if (hasFocus) {
                    handler.postDelayed(slideRunnable, 5000)
                } else {
                    handler.removeCallbacks(slideRunnable)
                }
            }
        }

        fun stopTimer() {
            handler.removeCallbacks(slideRunnable)
        }

        private fun resetTimer() {
            handler.removeCallbacks(slideRunnable)
            handler.postDelayed(slideRunnable, 5000)
        }

        private fun setupDots() {
            dotsContainer.removeAllViews()
            for (i in movies.indices) {
                val dot = ImageView(view.context)
                dot.setImageResource(android.R.drawable.presence_invisible)
                val params = LinearLayout.LayoutParams(16, 16).apply { setMargins(8, 0, 8, 0) }
                dotsContainer.addView(dot, params)
            }
        }

        private fun updateUI() {
            val movie = movies[currentIndex]

            // 1. Text Mappings
            title.text = movie.title ?: "Unknown"
            year.text = movie.releaseDate?.take(4) ?: ""
            genre.text = movie.genre ?: "Action"
            overview.text = movie.overview
            rating.text = String.format("%.1f", movie.voteAverage ?: 0.0)

            // 2. HD Quality Badge Logic
            if (!movie.quality.isNullOrEmpty()) {
                qualityBadge.text = movie.quality
                qualityBadge.visibility = View.VISIBLE
            } else {
                qualityBadge.visibility = View.GONE
            }

            // 3. Update Dot Indicators
            for (i in 0 until dotsContainer.childCount) {
                val dot = dotsContainer.getChildAt(i) as ImageView
                if (i == currentIndex) {
                    dot.setImageResource(android.R.drawable.presence_online) // Active dot
                } else {
                    dot.setImageResource(android.R.drawable.presence_invisible) // Inactive dot
                }
            }

            // 4. Image Load with Smooth Crossfade
            var bgUrl = movie.backdropPathTv ?: movie.backdropPath
            if (bgUrl != null && bgUrl.startsWith("http://")) {
                bgUrl = bgUrl.replace("http://", "https://")
            }

            Glide.with(view.context)
                .load(bgUrl)
                .transition(DrawableTransitionOptions.withCrossFade(300)) // Smooth fade transition
                .into(backdrop)
        }
    }
}