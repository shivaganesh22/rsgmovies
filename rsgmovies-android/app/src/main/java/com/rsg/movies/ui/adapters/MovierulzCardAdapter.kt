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
import com.rsg.movies.data.model.MovierulzMovieItem

class MovierulzCardAdapter(
    private val items: List<MovierulzMovieItem>,
    private val onItemClick: (MovierulzMovieItem) -> Unit
) : RecyclerView.Adapter<MovierulzCardAdapter.CardViewHolder>() {

    inner class CardViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val root: View = view
        val flPoster: View = view.findViewById(R.id.fl_poster_container)
        val ivPoster: ImageView = view.findViewById(R.id.iv_poster)
        val tvQuality: TextView = view.findViewById(R.id.tv_badge_quality)
        val tvType: TextView = view.findViewById(R.id.tv_badge_type)
        val llRating: LinearLayout = view.findViewById(R.id.ll_rating)
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

        val lp = holder.root.layoutParams
        val posterLp = holder.flPoster.layoutParams
        lp.width = dpToPx(132f)
        posterLp.height = dpToPx(198f)
        lp.height = ViewGroup.LayoutParams.WRAP_CONTENT
        holder.root.layoutParams = lp
        holder.flPoster.layoutParams = posterLp

        holder.tvTitle.text = item.getDisplayTitle()

        // Quality Badge
        val q = item.quality?.trim() ?: "HD"
        holder.tvQuality.text = q
        holder.tvQuality.visibility = View.VISIBLE
        if (item.isCamOrDvdScr()) {
            holder.tvQuality.setBackgroundResource(R.drawable.badge_cam_bg)
        } else {
            holder.tvQuality.setBackgroundResource(R.drawable.badge_hd_bg)
        }

        // Language
        val lang = item.language?.trim() ?: "Movie"
        holder.tvGenre.text = lang
        holder.tvGenre.visibility = View.VISIBLE

        // Year
        if (!item.year.isNullOrBlank()) {
            holder.tvYear.text = item.year
            holder.tvYear.visibility = View.VISIBLE
        } else {
            holder.tvYear.visibility = View.GONE
        }

        holder.llRating.visibility = View.GONE

        Glide.with(context)
            .load(item.image?.ifBlank { null })
            .placeholder(R.drawable.ic_placeholder)
            .error(R.drawable.ic_placeholder)
            .transition(DrawableTransitionOptions.withCrossFade(150))
            .into(holder.ivPoster)

        fun applyFocusState(hasFocus: Boolean) {
            if (hasFocus) {
                holder.tvTitle.setTextColor(context.resources.getColor(R.color.text_accent))
            } else {
                holder.tvTitle.setTextColor(context.resources.getColor(R.color.text_white))
            }
        }

        holder.root.setOnFocusChangeListener { v, hasFocus ->
            applyFocusState(hasFocus)
            if (hasFocus) {
                val pad = dpToPx(30f)
                val rect = android.graphics.Rect(0, -pad, v.width, v.height + pad)
                v.requestRectangleOnScreen(rect, false)
            }
        }

        holder.root.setOnHoverListener { v, event ->
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

        holder.root.setOnClickListener {
            onItemClick(item)
        }
    }

    override fun getItemCount(): Int = items.size
}
