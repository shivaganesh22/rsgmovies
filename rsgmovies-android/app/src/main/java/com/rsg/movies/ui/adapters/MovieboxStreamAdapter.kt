package com.rsg.movies.ui.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.rsg.movies.R
import com.rsg.movies.data.model.MovieboxStreamItem

class MovieboxStreamAdapter(
    private val streams: List<MovieboxStreamItem>,
    private var selectedIndex: Int = 0,
    private val onStreamSelected: (MovieboxStreamItem, Int) -> Unit
) : RecyclerView.Adapter<MovieboxStreamAdapter.ViewHolder>() {

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvServerName: TextView = view.findViewById(R.id.tv_stream_server_name)
        val tvLang: TextView = view.findViewById(R.id.tv_stream_lang)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_stream_pill, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val stream = streams[position]
        holder.tvServerName.text = stream.getDisplayFormat()
        holder.tvLang.text = stream.getQualityLabel()

        holder.itemView.isSelected = (position == selectedIndex)

        holder.itemView.setOnFocusChangeListener { _, hasFocus ->
            holder.tvServerName.setTextColor(
                android.graphics.Color.parseColor(if (hasFocus) "#60a5fa" else "#FFFFFF")
            )
        }

        holder.itemView.setOnClickListener {
            val prev = selectedIndex
            selectedIndex = holder.bindingAdapterPosition
            if (prev >= 0) notifyItemChanged(prev)
            notifyItemChanged(selectedIndex)
            onStreamSelected(stream, selectedIndex)
        }
    }

    override fun getItemCount(): Int = streams.size
}
