package com.rsg.movies.ui.presenters

import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.leanback.widget.Presenter
import com.bumptech.glide.Glide
import com.bumptech.glide.load.resource.bitmap.CenterCrop
import com.rsg.movies.R
import com.rsg.movies.data.model.MediaItem

class MovieCardPresenter : Presenter() {
    override fun onCreateViewHolder(parent: ViewGroup): ViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_movie_card, parent, false)
        view.setOnFocusChangeListener { v, hasFocus ->
            // Scale and show overlays ONLY on focus change
            val scale = if (hasFocus) 1.05f else 1.0f
            v.animate().scaleX(scale).scaleY(scale).setDuration(200).start()

            v.findViewById<View>(R.id.hover_overlay).visibility = if (hasFocus) View.VISIBLE else View.INVISIBLE
            v.findViewById<View>(R.id.play_icon).visibility = if (hasFocus) View.VISIBLE else View.INVISIBLE

            // Turn Title text Red on hover
            val title = v.findViewById<TextView>(R.id.text_title)
            title.setTextColor(Color.parseColor(if (hasFocus) "#EF4444" else "#FFFFFF"))

            // Slight elevation pop
            v.elevation = if (hasFocus) 8f else 0f
        }
        return ViewHolder(view)
    }

    override fun onBindViewHolder(viewHolder: ViewHolder, item: Any) {
        val movie = item as MediaItem
        val view = viewHolder.view

        view.findViewById<TextView>(R.id.text_title).text = movie.title ?: "Unknown"
        view.findViewById<TextView>(R.id.text_year).text = movie.releaseDate?.take(4) ?: ""

        // Sharp Yellow Badge
        val badgeQuality = view.findViewById<TextView>(R.id.badge_quality)
        if (!movie.quality.isNullOrEmpty()) {
            badgeQuality.text = movie.quality
            badgeQuality.setBackgroundColor(Color.parseColor("#EAB308"))
            badgeQuality.visibility = View.VISIBLE
        } else {
            badgeQuality.visibility = View.GONE
        }

        // Sharp Green Subtitle Badge
        val badgeSubtitle = view.findViewById<TextView>(R.id.badge_subtitle)
        if (!movie.subtitle.isNullOrEmpty()) {
            badgeSubtitle.text = movie.subtitle
            badgeSubtitle.setBackgroundColor(Color.parseColor("#22C55E"))
            badgeSubtitle.visibility = View.VISIBLE
        } else {
            badgeSubtitle.visibility = View.GONE
        }

        // Safely parse newEpisodes
        val badgeNew = view.findViewById<TextView>(R.id.badge_new_ep)
        val parsedNewEpisodes = movie.newEpisodes?.toString()?.toDoubleOrNull()?.toInt() ?: 0
        if (parsedNewEpisodes > 0) {
            badgeNew.visibility = View.VISIBLE
        } else {
            badgeNew.visibility = View.GONE
        }

        var imgUrl = movie.posterPath ?: movie.stillPath
        if (imgUrl != null && imgUrl.startsWith("http://")) imgUrl = imgUrl.replace("http://", "https://")
        Glide.with(view.context).load(imgUrl).transform(CenterCrop()).into(view.findViewById(R.id.poster_image))
    }

    override fun onUnbindViewHolder(viewHolder: ViewHolder) {
        // Clear references if needed, but do NOT force visibility states here.
    }
}