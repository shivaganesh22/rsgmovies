package com.rsg.movies.ui.adapters

import android.content.Intent
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.rsg.movies.R
import com.rsg.movies.data.model.MediaItem
import com.rsg.movies.ui.viewall.ViewAllActivity

data class HomeSection(
    val title: String,
    val items: List<MediaItem>,
    val categoryKey: String? = null,
    val isEpisodeRow: Boolean = false
)

class ModernHomeSectionAdapter(
    private val sections: List<HomeSection>,
    private val onUpOnTopRow: (() -> Unit)? = null,
    private val onItemClick: ((MediaItem) -> Unit)? = null
) : RecyclerView.Adapter<ModernHomeSectionAdapter.SectionViewHolder>() {

    inner class SectionViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvTitle: TextView = view.findViewById(R.id.tv_category_title)
        val tvViewAll: TextView = view.findViewById(R.id.tv_view_all_btn)
        val rvItems: RecyclerView = view.findViewById(R.id.rv_category_items)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): SectionViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_category_row, parent, false)
        return SectionViewHolder(view)
    }

    override fun onBindViewHolder(holder: SectionViewHolder, position: Int) {
        val section = sections[position]
        holder.tvTitle.text = section.title

        val context = holder.itemView.context

        if (!section.categoryKey.isNullOrBlank()) {
            holder.tvViewAll.visibility = View.VISIBLE
            holder.tvViewAll.setOnClickListener {
                val intent = Intent(context, ViewAllActivity::class.java).apply {
                    putExtra("CATEGORY", section.categoryKey)
                    putExtra("TITLE", section.title)
                    putExtra("IS_EPISODE", section.isEpisodeRow)
                }
                context.startActivity(intent)
            }
        } else {
            holder.tvViewAll.visibility = View.GONE
        }

        com.rsg.movies.ui.TvFocusHelper.attachHorizontalRowFocus(
            holder.rvItems,
            onLeftAtStart = {
                com.rsg.movies.ui.TvFocusHelper.focusSidebar(context as? android.app.Activity)
            },
            onUpAtStart = if (position == 0) onUpOnTopRow else null
        )

        holder.rvItems.adapter = ModernMediaCardAdapter(section.items, onItemClick, section.isEpisodeRow)
    }

    override fun getItemCount(): Int = sections.size
}
