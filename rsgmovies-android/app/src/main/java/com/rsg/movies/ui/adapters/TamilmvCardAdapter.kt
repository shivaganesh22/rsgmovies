package com.rsg.movies.ui.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.rsg.movies.R
import com.rsg.movies.data.model.TamilmvItem

class TamilmvCardAdapter(
    private val items: List<TamilmvItem>,
    private val onItemClick: (TamilmvItem) -> Unit
) : RecyclerView.Adapter<TamilmvCardAdapter.CardViewHolder>() {

    inner class CardViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val root: View = view
        val tvTitle: TextView = view.findViewById(R.id.tv_tamilmv_title)
        val tvLang: TextView = view.findViewById(R.id.tv_tamilmv_lang)
        val tvQuality: TextView = view.findViewById(R.id.tv_tamilmv_quality)
        val tvYear: TextView = view.findViewById(R.id.tv_tamilmv_year)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): CardViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_tamilmv_card, parent, false)
        return CardViewHolder(view)
    }

    override fun onBindViewHolder(holder: CardViewHolder, position: Int) {
        val item = items[position]
        holder.tvTitle.text = item.name ?: item.slug?.replace("-", " ") ?: "TamilMV Release"

        val langs = item.getDisplayLanguages()
        holder.tvLang.text = langs.joinToString(", ")

        val q = item.quality ?: "HD"
        holder.tvQuality.text = q
        if (item.isCamOrPreDvd()) {
            holder.tvQuality.setBackgroundResource(R.drawable.badge_cam_bg)
        } else {
            holder.tvQuality.setBackgroundResource(R.drawable.badge_hd_bg)
        }

        if (!item.year.isNullOrBlank()) {
            holder.tvYear.text = "(${item.year})"
            holder.tvYear.visibility = View.VISIBLE
        } else {
            holder.tvYear.visibility = View.GONE
        }

        holder.root.setOnFocusChangeListener { v, hasFocus ->
            if (hasFocus) {
                v.animate().scaleX(1.02f).scaleY(1.02f).translationZ(6f).setDuration(120).start()
            } else {
                v.animate().scaleX(1.0f).scaleY(1.0f).translationZ(0f).setDuration(120).start()
            }
        }

        holder.root.setOnClickListener {
            onItemClick(item)
        }
    }

    override fun getItemCount(): Int = items.size
}
