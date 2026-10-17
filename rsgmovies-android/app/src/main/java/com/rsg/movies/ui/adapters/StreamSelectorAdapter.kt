package com.rsg.movies.ui.adapters

import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.rsg.movies.R
import com.rsg.movies.data.model.VideoItem

class StreamSelectorAdapter(
    private val videos: List<VideoItem>,
    private var selectedIndex: Int = -1,
    private val onStreamSelected: (VideoItem, Int) -> Unit
) : RecyclerView.Adapter<StreamSelectorAdapter.ViewHolder>() {

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvServerName: TextView = view.findViewById(R.id.tv_stream_server_name)
        val tvLang: TextView = view.findViewById(R.id.tv_stream_lang)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_stream_pill, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val video = videos[position]
        holder.tvServerName.text = video.server ?: "Server ${position + 1}"
        holder.tvLang.text = video.lang ?: "Default"
        holder.itemView.isSelected = (position == selectedIndex && selectedIndex >= 0)

        holder.itemView.setOnFocusChangeListener { _, hasFocus ->
            holder.tvServerName.setTextColor(
                android.graphics.Color.parseColor(if (hasFocus) "#60a5fa" else "#FFFFFF")
            )
        }

        holder.itemView.setOnHoverListener { v, event ->
            when (event.action) {
                MotionEvent.ACTION_HOVER_ENTER -> {
                    v.requestFocus()
                    true
                }
                else -> false
            }
        }

        holder.itemView.setOnClickListener {
            val prev = selectedIndex
            selectedIndex = holder.bindingAdapterPosition
            if (prev >= 0) notifyItemChanged(prev)
            notifyItemChanged(selectedIndex)
            onStreamSelected(video, selectedIndex)
        }
    }

    override fun getItemCount(): Int = videos.size
}
