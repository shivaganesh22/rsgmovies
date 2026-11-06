package com.rsg.movies.ui.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.rsg.movies.R
import com.rsg.movies.data.model.MovierulzTorrentLink

class MovierulzLinkAdapter(
    private val links: List<MovierulzTorrentLink>,
    private val onSeedrClick: (MovierulzTorrentLink) -> Unit,
    private val onMagnetClick: (MovierulzTorrentLink) -> Unit,
    private val onCopyClick: (MovierulzTorrentLink) -> Unit
) : RecyclerView.Adapter<MovierulzLinkAdapter.LinkViewHolder>() {

    inner class LinkViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val root: View = view
        val tvRes: TextView = view.findViewById(R.id.tv_link_res)
        val tvName: TextView = view.findViewById(R.id.tv_link_name)
        val tvSize: TextView = view.findViewById(R.id.tv_link_size)
        val btnSeedr: Button = view.findViewById(R.id.btn_link_seedr)
        val btnMagnet: Button = view.findViewById(R.id.btn_link_magnet)
        val btnCopy: Button = view.findViewById(R.id.btn_link_copy)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): LinkViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_tamilmv_download_link, parent, false)
        return LinkViewHolder(view)
    }

    override fun onBindViewHolder(holder: LinkViewHolder, position: Int) {
        val link = links[position]
        holder.tvRes.text = link.getResolutionBadge()
        holder.tvName.text = link.name ?: "Movierulz Torrent"

        if (!link.size.isNullOrBlank()) {
            holder.tvSize.text = "Size: ${link.size}"
            holder.tvSize.visibility = View.VISIBLE
        } else {
            holder.tvSize.visibility = View.GONE
        }

        holder.btnSeedr.setOnClickListener { onSeedrClick(link) }
        holder.btnMagnet.setOnClickListener { onMagnetClick(link) }
        holder.btnCopy.setOnClickListener { onCopyClick(link) }

        holder.root.setOnFocusChangeListener { _, hasFocus ->
            if (hasFocus) {
                holder.btnSeedr.requestFocus()
            }
        }
    }

    override fun getItemCount(): Int = links.size
}
