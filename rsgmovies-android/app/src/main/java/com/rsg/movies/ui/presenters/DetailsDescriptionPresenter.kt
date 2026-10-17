package com.rsg.movies.ui.presenters

import android.text.TextUtils
import androidx.leanback.widget.AbstractDetailsDescriptionPresenter
import com.rsg.movies.data.model.DetailData

class DetailsDescriptionPresenter : AbstractDetailsDescriptionPresenter() {

    override fun onBindDescription(viewHolder: ViewHolder, item: Any) {
        val media = item as? DetailData ?: return

        // 1. TITLE
        viewHolder.title.text = media.title ?: media.name ?: "Unknown Title"

        // ==========================================
        // 2. THE UI FIX: FORCE MULTI-LINE TEXT!
        // ==========================================
        viewHolder.subtitle.isSingleLine = false
        viewHolder.subtitle.maxLines = 4 // Allows up to 4 lines of tags/genres!
        viewHolder.subtitle.ellipsize = TextUtils.TruncateAt.END

        // 3. METADATA
        val metaData = mutableListOf<String>()

        if (media.vote_average != null && media.vote_average > 0) {
            metaData.add("⭐ ${String.format("%.1f", media.vote_average)}")
        }

        if (!media.subtitle.isNullOrBlank()) {
            metaData.add(media.subtitle.uppercase())
        }

        val dateString = media.release_date ?: media.first_air_date
        if (!dateString.isNullOrBlank() && dateString.length >= 4) {
            metaData.add("📅 ${dateString.take(4)}")
        }

        if (media.runtime != null && media.runtime > 0) {
            metaData.add("⏱ ${media.runtime} min")
        }

        if (media.views != null && media.views > 0) {
            metaData.add("👁 ${String.format("%,d", media.views)} views")
        }

        if (!media.seasons.isNullOrEmpty()) {
            val count = media.seasons.size
            metaData.add("📺 $count Season${if (count > 1) "s" else ""}")
        }

        val metaString = metaData.joinToString("  |  ")

        // 4. GENRES
        val genreNames = media.genres?.mapNotNull { it.name } ?: media.genreslist ?: emptyList()
        val genreString = genreNames.joinToString(", ")

        // Combine them with a newline break
        if (genreString.isNotEmpty()) {
            viewHolder.subtitle.text = "$metaString\n$genreString"
        } else {
            viewHolder.subtitle.text = metaString
        }

        // 5. OVERVIEW / BODY
        viewHolder.body.maxLines = 8 // Ensure description has plenty of space too
        viewHolder.body.text = media.overview ?: "No description available."
    }
}