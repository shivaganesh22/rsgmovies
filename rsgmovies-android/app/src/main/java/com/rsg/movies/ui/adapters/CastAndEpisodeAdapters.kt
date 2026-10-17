package com.rsg.movies.ui.adapters

import android.content.Intent
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.rsg.movies.R
import com.rsg.movies.data.model.CastItem
import com.rsg.movies.data.model.EpisodeItem
import com.rsg.movies.ui.person.PersonActivity

class ModernCastAdapter(
    private val castList: List<CastItem>,
    private val onCastClick: ((CastItem) -> Unit)? = null
) : RecyclerView.Adapter<ModernCastAdapter.CastViewHolder>() {

    inner class CastViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val ivAvatar: ImageView = view.findViewById(R.id.iv_cast_profile)
        val tvName: TextView = view.findViewById(R.id.tv_cast_name)
        val tvRole: TextView = view.findViewById(R.id.tv_cast_character)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): CastViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_modern_cast_card, parent, false)
        return CastViewHolder(view)
    }

    override fun onBindViewHolder(holder: CastViewHolder, position: Int) {
        val cast = castList[position]
        val context = holder.itemView.context

        holder.tvName.text = cast.name ?: "Unknown"
        holder.tvRole.text = cast.character ?: ""

        val profileUrl = cast.profile_path ?: ""
        Glide.with(context)
            .load(profileUrl)
            .placeholder(R.drawable.ic_placeholder)
            .error(R.drawable.ic_placeholder)
            .into(holder.ivAvatar)

        fun applyFocusState(hasFocus: Boolean) {
            holder.tvName.setTextColor(android.graphics.Color.parseColor(if (hasFocus) "#60a5fa" else "#FFFFFF"))
        }

        holder.itemView.setOnFocusChangeListener { _, hasFocus ->
            applyFocusState(hasFocus)
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
            if (onCastClick != null) {
                onCastClick.invoke(cast)
            } else {
                val intent = Intent(context, PersonActivity::class.java).apply {
                    putExtra("PERSON_ID", cast.id.toString())
                    putExtra("PERSON_NAME", cast.name ?: "Cast Member")
                    putExtra("PERSON_ROLE", cast.character ?: "")
                    putExtra("PROFILE_PATH", profileUrl)
                }
                context.startActivity(intent)
            }
        }
    }

    override fun getItemCount(): Int = castList.size
}

class ModernEpisodeAdapter(
    private val episodes: List<EpisodeItem>,
    private val seasonNumber: Int = 1,
    private val fallbackImage: String? = null,
    private val onEpisodeClick: (EpisodeItem) -> Unit
) : RecyclerView.Adapter<ModernEpisodeAdapter.EpisodeViewHolder>() {

    inner class EpisodeViewHolder(view: View) : RecyclerView.ViewHolder(view) {
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
        val context = holder.itemView.context

        val epNum = ep.episode_number ?: (position + 1)
        val sNum = ep.season_number ?: seasonNumber
        holder.tvBadge.text = "S${sNum}E${epNum}"

        val titleText = ep.name?.takeIf { it.isNotBlank() } ?: "Episode $epNum"
        holder.tvTitle.text = "Ep $epNum: $titleText"

        if (holder.tvOverview != null) {
            val overview = ep.overview?.trim() ?: ""
            if (overview.isNotBlank()) {
                holder.tvOverview.text = overview
                holder.tvOverview.visibility = View.VISIBLE
            } else {
                holder.tvOverview.visibility = View.GONE
            }
        }

        val thumbUrl = ep.still_path_tv?.takeIf { it.isNotBlank() } ?: fallbackImage ?: ""
        Glide.with(context)
            .load(thumbUrl)
            .placeholder(R.drawable.ic_placeholder)
            .error(R.drawable.ic_placeholder)
            .into(holder.ivThumb)

        fun applyFocusState(hasFocus: Boolean) {
            holder.tvTitle.setTextColor(android.graphics.Color.parseColor(if (hasFocus) "#60a5fa" else "#FFFFFF"))
        }

        holder.itemView.setOnFocusChangeListener { _, hasFocus ->
            applyFocusState(hasFocus)
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
            onEpisodeClick(ep)
        }
    }

    override fun getItemCount(): Int = episodes.size
}
