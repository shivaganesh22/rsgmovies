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
import com.rsg.movies.data.model.LiveTvChannel

class LiveTvCardAdapter(
    private val items: List<LiveTvChannel>,
    private val onItemClick: (LiveTvChannel) -> Unit,
    private val onItemLongClick: ((LiveTvChannel) -> Unit)? = null
) : RecyclerView.Adapter<LiveTvCardAdapter.CardViewHolder>() {

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
        posterLp.height = dpToPx(110f)
        lp.height = ViewGroup.LayoutParams.WRAP_CONTENT
        holder.root.layoutParams = lp
        holder.flPoster.layoutParams = posterLp

        // Title
        holder.tvTitle.text = item.getDisplayName()

        // Category
        holder.tvGenre.text = item.category ?: "Live TV"
        holder.tvGenre.visibility = View.VISIBLE

        // Country / Resolution
        holder.tvYear.text = item.country ?: "IN"
        holder.tvYear.visibility = View.VISIBLE

        // Quality Badge
        val q = item.getQualityBadge()
        holder.tvQuality.text = q
        holder.tvQuality.visibility = View.VISIBLE
        if (q.contains("FHD", true) || q.contains("4K", true) || q.contains("1080", true)) {
            holder.tvQuality.setBackgroundResource(R.drawable.badge_hd_bg)
        } else {
            holder.tvQuality.setBackgroundResource(R.drawable.badge_bg)
        }

        // Live Type Badge
        holder.tvType.text = "LIVE"
        holder.tvType.visibility = View.VISIBLE
        holder.tvType.setBackgroundResource(R.drawable.badge_new_bg)

        holder.llRating.visibility = View.GONE

        // Channel Logo
        val logoUrl = item.logo?.ifBlank { null }
        holder.ivPoster.scaleType = ImageView.ScaleType.FIT_CENTER
        holder.ivPoster.setPadding(dpToPx(12f), dpToPx(12f), dpToPx(12f), dpToPx(12f))
        Glide.with(context)
            .load(logoUrl)
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

        holder.root.setOnLongClickListener {
            onItemLongClick?.invoke(item)
            true
        }

        holder.root.setOnKeyListener { _, keyCode, event ->
            if (event.action == android.view.KeyEvent.ACTION_DOWN) {
                if (keyCode == android.view.KeyEvent.KEYCODE_MENU) {
                    onItemLongClick?.invoke(item)
                    return@setOnKeyListener true
                }
            }
            false
        }
    }

    override fun getItemCount(): Int = items.size
}
