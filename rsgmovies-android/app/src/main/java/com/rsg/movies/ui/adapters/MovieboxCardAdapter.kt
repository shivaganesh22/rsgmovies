package com.rsg.movies.ui.adapters

import android.util.TypedValue
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.bumptech.glide.load.resource.drawable.DrawableTransitionOptions
import com.rsg.movies.R
import com.rsg.movies.data.model.MovieboxSubjectItem

class MovieboxCardAdapter(
    private val items: List<MovieboxSubjectItem>,
    private val onItemClick: ((MovieboxSubjectItem) -> Unit)? = null
) : RecyclerView.Adapter<MovieboxCardAdapter.CardViewHolder>() {

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

        val lp = holder.rootContainer.layoutParams
        val posterLp = holder.flPoster.layoutParams
        lp.width = dpToPx(132f)
        posterLp.height = dpToPx(198f)
        lp.height = ViewGroup.LayoutParams.WRAP_CONTENT
        holder.rootContainer.layoutParams = lp
        holder.flPoster.layoutParams = posterLp

        // Title
        holder.tvTitle.text = item.getCleanTitle()

        // Rating
        val rating = item.getRating()
        if (rating > 0.0) {
            holder.llRating.visibility = View.VISIBLE
            holder.tvRating.text = String.format("%.1f", rating)
        } else {
            holder.llRating.visibility = View.GONE
        }

        // Year
        val year = item.getDisplayYear()
        if (year.isNotBlank()) {
            holder.tvYear.text = year
            holder.tvYear.visibility = View.VISIBLE
        } else {
            holder.tvYear.visibility = View.GONE
        }

        // Genre / Series tag
        val genre = item.genre?.split(",")?.firstOrNull()?.trim() ?: if (item.isSeries()) "SERIES" else "MOVIE"
        holder.tvGenre.text = genre
        holder.tvGenre.visibility = View.VISIBLE

        // Badge: Series vs Movie vs Coming Soon
        if (!item.appointmentDate.isNullOrBlank()) {
            holder.tvQuality.visibility = View.VISIBLE
            holder.tvQuality.text = "SOON"
            holder.tvQuality.setBackgroundResource(R.drawable.badge_cam_bg)
        } else if (item.isSeries()) {
            holder.tvQuality.visibility = View.VISIBLE
            holder.tvQuality.text = "SERIES"
            holder.tvQuality.setBackgroundResource(R.drawable.badge_hd_bg)
        } else {
            holder.tvQuality.visibility = View.GONE
        }

        // Poster image
        val coverUrl = item.getCoverUrl()
        Glide.with(context)
            .load(coverUrl.ifEmpty { null })
            .placeholder(R.drawable.ic_placeholder)
            .error(R.drawable.ic_placeholder)
            .transition(DrawableTransitionOptions.withCrossFade(150))
            .into(holder.ivPoster)

        holder.rootContainer.setOnFocusChangeListener { v, hasFocus ->
            if (hasFocus) {
                v.animate().scaleX(1.08f).scaleY(1.08f).translationZ(8f).setDuration(120).start()
            } else {
                v.animate().scaleX(1.0f).scaleY(1.0f).translationZ(0f).setDuration(120).start()
            }
        }

        holder.rootContainer.setOnClickListener {
            onItemClick?.invoke(item)
        }
    }

    override fun getItemCount(): Int = items.size
}
