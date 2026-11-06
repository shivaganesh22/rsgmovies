package com.rsg.movies.ui.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.rsg.movies.R
import com.rsg.movies.data.model.TamilmvDownloadLink

class TamilmvLinkAdapter(
    private val links: List<TamilmvDownloadLink>,
    private val onSeedrClick: (TamilmvDownloadLink) -> Unit,
    private val onDirectClick: (TamilmvDownloadLink) -> Unit,
    private val onMagnetClick: (TamilmvDownloadLink) -> Unit,
    private val onCopyClick: (TamilmvDownloadLink) -> Unit
) : RecyclerView.Adapter<TamilmvLinkAdapter.LinkViewHolder>() {

    inner class LinkViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val root: View = view
        val tvRes: TextView = view.findViewById(R.id.tv_link_res)
        val tvName: TextView = view.findViewById(R.id.tv_link_name)
        val tvSize: TextView = view.findViewById(R.id.tv_link_size)
        val btnSeedr: Button = view.findViewById(R.id.btn_link_seedr)
        val btnDirect: Button = view.findViewById(R.id.btn_link_direct)
        val btnMagnet: Button = view.findViewById(R.id.btn_link_magnet)
        val btnCopy: Button = view.findViewById(R.id.btn_link_copy)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): LinkViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_tamilmv_download_link, parent, false)
        return LinkViewHolder(view)
    }

    override fun onBindViewHolder(holder: LinkViewHolder, position: Int) {
        val link = links[position]
        holder.tvRes.text = link.getResolutionTag()
        holder.tvName.text = link.name ?: "Torrent Download"

        if (!link.size.isNullOrBlank()) {
            holder.tvSize.text = "Size: ${link.size}"
            holder.tvSize.visibility = View.VISIBLE
        } else {
            holder.tvSize.visibility = View.GONE
        }

        if (!link.direct_link.isNullOrBlank()) {
            holder.btnDirect.visibility = View.VISIBLE
            holder.btnDirect.setOnClickListener { onDirectClick(link) }
        } else {
            holder.btnDirect.visibility = View.GONE
        }

        holder.btnSeedr.setOnClickListener { onSeedrClick(link) }
        holder.btnMagnet.setOnClickListener { onMagnetClick(link) }
        holder.btnCopy.setOnClickListener { onCopyClick(link) }

        holder.root.setOnFocusChangeListener { v, hasFocus ->
            if (hasFocus) {
                holder.btnSeedr.requestFocus()
            }
        }
    }

    override fun getItemCount(): Int = links.size
}
