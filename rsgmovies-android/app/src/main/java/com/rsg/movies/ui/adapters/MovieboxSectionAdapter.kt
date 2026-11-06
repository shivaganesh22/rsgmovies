package com.rsg.movies.ui.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.rsg.movies.R
import com.rsg.movies.data.model.MovieboxSubjectItem

data class MovieboxCategorySection(
    val title: String,
    val items: List<MovieboxSubjectItem>
)

class MovieboxSectionAdapter(
    private val sections: List<MovieboxCategorySection>,
    private val onUpOnTopRow: (() -> Unit)? = null,
    private val onItemClick: ((MovieboxSubjectItem) -> Unit)? = null
) : RecyclerView.Adapter<MovieboxSectionAdapter.SectionViewHolder>() {

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
        holder.tvViewAll.visibility = View.GONE

        val context = holder.itemView.context

        com.rsg.movies.ui.TvFocusHelper.attachHorizontalRowFocus(
            holder.rvItems,
            onLeftAtStart = {
                com.rsg.movies.ui.TvFocusHelper.focusSidebar(context as? android.app.Activity)
            },
            onUpAtStart = if (position == 0) onUpOnTopRow else null
        )

        holder.rvItems.adapter = MovieboxCardAdapter(section.items, onItemClick)
    }

    override fun getItemCount(): Int = sections.size
}
