package com.rsg.movies.ui.adapters

import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.rsg.movies.R
import com.rsg.movies.data.model.MovieboxEpisodeItem

class MovieboxEpisodeAdapter(
    private val episodes: List<MovieboxEpisodeItem>,
    private val seasonNumber: Int = 1,
    private val fallbackImage: String? = null,
    private var selectedEpisodeNum: Int = 1,
    private val onEpisodeSelected: (MovieboxEpisodeItem) -> Unit
) : RecyclerView.Adapter<MovieboxEpisodeAdapter.EpisodeViewHolder>() {

    class EpisodeViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val ivThumb: ImageView = view.findViewById(R.id.iv_episode_thumb)
        val tvBadge: TextView = view.findViewById(R.id.tv_episode_badge)
        val tvTitle: TextView = view.findViewById(R.id.tv_episode_title)
        val tvOverview: TextView? = view.findViewById(R.id.tv_episode_overview)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): EpisodeViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_modern_episode_card, parent, false)
        return EpisodeViewHolder(view)
    }

    override fun onBindViewHolder(holder: EpisodeViewHolder, position: Int) {
        val ep = episodes[position]
        val epNum = ep.episode ?: (position + 1)
        val isSelected = (epNum == selectedEpisodeNum)

        holder.tvBadge.text = "S${seasonNumber}E${epNum}"
        val titleText = ep.title?.takeIf { it.isNotBlank() } ?: "Episode $epNum"
        holder.tvTitle.text = if (titleText.startsWith("Episode", ignoreCase = true) || titleText.startsWith("Ep", ignoreCase = true)) {
            titleText
        } else {
            "Ep $epNum: $titleText"
        }

        holder.tvOverview?.visibility = View.GONE

        val thumbUrl = ep.cover?.takeIf { it.isNotBlank() } ?: fallbackImage ?: ""
        Glide.with(holder.itemView.context)
            .load(thumbUrl.ifEmpty { null })
            .placeholder(R.drawable.ic_placeholder)
            .error(R.drawable.ic_placeholder)
            .into(holder.ivThumb)

        holder.itemView.isSelected = isSelected

        holder.itemView.setOnFocusChangeListener { _, hasFocus ->
            holder.tvTitle.setTextColor(Color.parseColor(if (hasFocus) "#60a5fa" else if (isSelected) "#38bdf8" else "#FFFFFF"))
        }

        holder.itemView.setOnClickListener {
            selectedEpisodeNum = epNum
            notifyDataSetChanged()
            onEpisodeSelected(ep)
        }
    }

    override fun getItemCount(): Int = episodes.size
}
