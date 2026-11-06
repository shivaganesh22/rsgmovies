package com.rsg.movies.ui.adapters

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
    private var selectedEpisodeNum: Int = 1,
    private val onEpisodeSelected: (MovieboxEpisodeItem) -> Unit
) : RecyclerView.Adapter<MovieboxEpisodeAdapter.EpisodeViewHolder>() {

    inner class EpisodeViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val root: View = view
        val ivCover: ImageView = view.findViewById(R.id.iv_episode_cover)
        val tvEpNumber: TextView = view.findViewById(R.id.tv_episode_number)
        val tvEpTitle: TextView = view.findViewById(R.id.tv_episode_title)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): EpisodeViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_moviebox_episode, parent, false)
        return EpisodeViewHolder(view)
    }

    override fun onBindViewHolder(holder: EpisodeViewHolder, position: Int) {
        val ep = episodes[position]
        val epNum = ep.episode ?: (position + 1)
        holder.tvEpNumber.text = "Episode $epNum"
        holder.tvEpTitle.text = ep.title?.ifBlank { "Episode $epNum" } ?: "Episode $epNum"

        val isSelected = (epNum == selectedEpisodeNum)
        holder.root.isSelected = isSelected

        Glide.with(holder.itemView.context)
            .load(ep.cover?.ifBlank { null })
            .placeholder(R.drawable.ic_placeholder)
            .error(R.drawable.ic_placeholder)
            .into(holder.ivCover)

        holder.root.setOnFocusChangeListener { v, hasFocus ->
            if (hasFocus) {
                v.animate().scaleX(1.06f).scaleY(1.06f).setDuration(120).start()
            } else {
                v.animate().scaleX(1.0f).scaleY(1.0f).setDuration(120).start()
            }
        }

        holder.root.setOnClickListener {
            selectedEpisodeNum = epNum
            notifyDataSetChanged()
            onEpisodeSelected(ep)
        }
    }

    override fun getItemCount(): Int = episodes.size
}
