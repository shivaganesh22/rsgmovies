package com.rsg.movies.ui.adapters

import android.content.Intent
import android.util.TypedValue
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.rsg.movies.R
import com.rsg.movies.data.model.MediaItem
import com.rsg.movies.ui.details.DetailsActivity

class ModernMediaCardAdapter(
    private val items: List<MediaItem>,
    private val onItemClick: ((MediaItem) -> Unit)? = null,
    private val isEpisodeRow: Boolean = false,
    private val showTypeBadge: Boolean = false
) : RecyclerView.Adapter<ModernMediaCardAdapter.CardViewHolder>() {

    inner class CardViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val rootContainer: View = view
        val flPoster: View = view.findViewById(R.id.fl_poster_container)
        val ivPoster: ImageView = view.findViewById(R.id.iv_poster)
        val tvQuality: TextView = view.findViewById(R.id.tv_badge_quality)
        val tvType: TextView = view.findViewById(R.id.tv_badge_type)
        val llRating: LinearLayout = view.findViewById(R.id.ll_rating)
        val tvRating: TextView = view.findViewById(R.id.tv_rating)
        val tvTitle: TextView = view.findViewById(R.id.tv_title)
        val tvGenre: TextView = view.findViewById(R.id.tv_genre)
        val tvYear: TextView = view.findViewById(R.id.tv_year)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): CardViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_modern_media_card, parent, false)
        return CardViewHolder(view)
    }

    override fun onBindViewHolder(holder: CardViewHolder, position: Int) {
        val item = items[position]
        val context = holder.itemView.context

        fun dpToPx(dp: Float): Int {
            return TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, dp, context.resources.displayMetrics).toInt()
        }

        // Apply exact dimensions for width and image container based on row type
        val lp = holder.rootContainer.layoutParams
        val posterLp = holder.flPoster.layoutParams
        if (isEpisodeRow) {
            lp.width = dpToPx(210f)
            posterLp.height = dpToPx(120f)
        } else {
            lp.width = dpToPx(132f)
            posterLp.height = dpToPx(198f)
        }
        lp.height = ViewGroup.LayoutParams.WRAP_CONTENT
        holder.rootContainer.layoutParams = lp
        holder.flPoster.layoutParams = posterLp

        // Rating
        val rating = item.voteAverage
        if (rating != null && rating > 0.0 && !isEpisodeRow) {
            holder.llRating.visibility = View.VISIBLE
            holder.tvRating.text = String.format("%.1f", rating)
        } else {
            holder.llRating.visibility = View.GONE
        }

        // Title
        val displayTitle = item.title ?: item.episodeName ?: "Untitled"
        holder.tvTitle.text = displayTitle

        // Genre
        val genre = item.getDisplayGenre()
        if (genre.isNotBlank()) {
            holder.tvGenre.text = genre
            holder.tvGenre.visibility = View.VISIBLE
        } else {
            holder.tvGenre.visibility = View.GONE
        }

        // Year
        val displayYear = item.getDisplayYear()
        if (displayYear.isNotBlank()) {
            holder.tvYear.text = displayYear
            holder.tvYear.visibility = View.VISIBLE
        } else {
            holder.tvYear.visibility = View.GONE
        }

        // Quality / Episode / NEW badge
        val badge = item.getQualityBadge()
        if (badge.isNotBlank()) {
            holder.tvQuality.visibility = View.VISIBLE
            holder.tvQuality.text = badge
            when {
                badge.contains("NEW", ignoreCase = true) -> holder.tvQuality.setBackgroundResource(R.drawable.badge_new_bg)
                badge.contains("CAM", ignoreCase = true) -> holder.tvQuality.setBackgroundResource(R.drawable.badge_cam_bg)
                badge.contains("HD", ignoreCase = true) || badge.startsWith("S") -> holder.tvQuality.setBackgroundResource(R.drawable.badge_hd_bg)
                else -> holder.tvQuality.setBackgroundResource(R.drawable.badge_bg)
            }
        } else {
            holder.tvQuality.visibility = View.GONE
        }

        // Type Badge (MOVIE / SERIES)
        if (showTypeBadge) {
            val itemType = item.type ?: ""
            val isSeriesItem = itemType.equals("serie", true) || itemType.equals("series", true) || item.seasonNumber != null || item.episodeNumber != null
            holder.tvType.text = if (isSeriesItem) "SERIES" else "MOVIE"
            holder.tvType.visibility = View.VISIBLE
        } else {
            holder.tvType.visibility = View.GONE
        }

        // Poster / Still image
        val imagePath = if (isEpisodeRow) {
            item.stillPath ?: item.backdropPath ?: item.posterPath ?: ""
        } else {
            item.posterPath ?: item.backdropPath ?: item.stillPath ?: ""
        }

        Glide.with(context)
            .load(imagePath)
            .placeholder(R.drawable.ic_placeholder)
            .error(R.drawable.ic_placeholder)
            .into(holder.ivPoster)

        fun applyFocusState(hasFocus: Boolean) {
            if (hasFocus) {
                holder.tvTitle.setTextColor(context.resources.getColor(R.color.text_accent))
            } else {
                holder.tvTitle.setTextColor(context.resources.getColor(R.color.text_white))
            }
        }

        holder.itemView.setOnFocusChangeListener { v, hasFocus ->
            applyFocusState(hasFocus)
            if (hasFocus) {
                val pad = dpToPx(30f)
                val rect = android.graphics.Rect(0, -pad, v.width, v.height + pad)
                v.requestRectangleOnScreen(rect, false)
            }
        }

        holder.itemView.setOnHoverListener { v, event ->
            when (event.action) {
                android.view.MotionEvent.ACTION_HOVER_ENTER -> {
                    v.requestFocus()
                    applyFocusState(true)
                    true
                }
                android.view.MotionEvent.ACTION_HOVER_EXIT -> {
                    applyFocusState(v.hasFocus())
                    true
                }
                else -> false
            }
        }

        holder.itemView.setOnClickListener {
            if (onItemClick != null) {
                onItemClick.invoke(item)
            } else {
                val isEpisode = isEpisodeRow || item.seasonNumber != null || item.episodeNumber != null || (item.type?.lowercase() == "episode") || (item.stillPath != null && item.posterPath == null)
                // Web parity: const resolvedId = id || serieTmdb; targetLink = `/series/${resolvedId}`
                val targetId = if (isEpisode) {
                    val resolved = if (item.id != 0L) item.id else (item.seriesId ?: item.featuredId ?: 0L)
                    resolved.toString()
                } else {
                    (item.featuredId ?: item.id).toString()
                }
                val intent = Intent(context, DetailsActivity::class.java).apply {
                    putExtra("MEDIA_ID", targetId)
                    val type = item.type ?: ""
                    val isSeries = isEpisode || type.equals("serie", true) || type.equals("series", true) || item.isSeriesType()
                    putExtra("MEDIA_TYPE", if (isSeries) "serie" else "movie")
                    item.seasonNumber?.let { putExtra("SEASON_NO", it) }
                    item.episodeNumber?.let { putExtra("EPISODE_NO", it) }
                }
                context.startActivity(intent)
            }
        }
    }

    override fun getItemCount(): Int = items.size
}
