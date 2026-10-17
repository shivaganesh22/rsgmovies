package com.rsg.movies.ui.files

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.rsg.movies.R
import com.rsg.movies.data.model.Folder

class FolderListAdapter(
    private val folders: List<Folder>,
    private val onFolderClick: (Folder) -> Unit,
    private val onDeleteClick: (Folder, Int) -> Unit
) : RecyclerView.Adapter<FolderListAdapter.ViewHolder>() {

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val cardContent: View = view.findViewById(R.id.card_folder_content)
        val tvName: TextView = view.findViewById(R.id.tv_folder_title)
        val tvMeta: TextView = view.findViewById(R.id.tv_folder_meta)
        val btnDelete: Button = view.findViewById(R.id.btn_delete_folder)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_modern_folder_card, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val folder = folders[position]
        val context = holder.itemView.context
        holder.tvName.text = folder.name

        val sizeMb = folder.size / (1024 * 1024)
        holder.tvMeta.text = if (sizeMb > 1024) {
            String.format("%.1f GB", sizeMb.toDouble() / 1024)
        } else {
            "$sizeMb MB"
        }

        fun applyCardFocus(hasFocus: Boolean) {
            holder.tvName.setTextColor(android.graphics.Color.parseColor(if (hasFocus) "#60a5fa" else "#FFFFFF"))
        }

        holder.cardContent.setOnFocusChangeListener { _, hasFocus ->
            applyCardFocus(hasFocus)
        }

        holder.cardContent.setOnHoverListener { v, event ->
            when (event.action) {
                android.view.MotionEvent.ACTION_HOVER_ENTER -> {
                    v.requestFocus()
                    applyCardFocus(true)
                    true
                }
                android.view.MotionEvent.ACTION_HOVER_EXIT -> {
                    applyCardFocus(v.hasFocus())
                    true
                }
                else -> false
            }
        }

        holder.cardContent.setOnClickListener {
            onFolderClick(folder)
        }

        holder.btnDelete.setOnFocusChangeListener { _, _ -> }

        holder.btnDelete.setOnClickListener {
            onDeleteClick(folder, holder.bindingAdapterPosition)
        }
    }

    override fun getItemCount(): Int = folders.size
}
