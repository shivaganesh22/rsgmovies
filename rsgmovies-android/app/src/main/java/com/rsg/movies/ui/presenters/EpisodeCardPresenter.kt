package com.rsg.movies.ui.presenters

import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.leanback.widget.Presenter
import com.bumptech.glide.Glide
import com.bumptech.glide.load.resource.bitmap.CenterCrop
import com.rsg.movies.R
import com.rsg.movies.data.model.MediaItem

class EpisodeCardPresenter : Presenter() {
    override fun onCreateViewHolder(parent: ViewGroup): ViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_episode_card, parent, false)
        view.setOnFocusChangeListener { v, hasFocus ->
            val scale = if (hasFocus) 1.05f else 1.0f
            v.animate().scaleX(scale).scaleY(scale).setDuration(200).start()

            v.findViewById<View>(R.id.hover_overlay).visibility = if (hasFocus) View.VISIBLE else View.INVISIBLE
            v.findViewById<View>(R.id.play_icon).visibility = if (hasFocus) View.VISIBLE else View.INVISIBLE

            val title = v.findViewById<TextView>(R.id.text_title)
            title.setTextColor(Color.parseColor(if (hasFocus) "#EF4444" else "#FFFFFF"))

            v.elevation = if (hasFocus) 8f else 0f
        }
        return ViewHolder(view)
    }

    override fun onBindViewHolder(viewHolder: ViewHolder, item: Any) {
        val episode = item as MediaItem
        val view = viewHolder.view

        val s = episode.seasonNumber ?: 1
        val e = episode.episodeNumber ?: 1
        val epName = episode.episodeName ?: ""
        view.findViewById<TextView>(R.id.text_title).text = "${episode.title}: S${s}E${e}: $epName"

        view.findViewById<TextView>(R.id.badge_episode).text = "S$s E$e"

        var imgUrl = episode.stillPath ?: episode.backdropPath
        if (imgUrl != null && imgUrl.startsWith("http://")) imgUrl = imgUrl.replace("http://", "https://")
        Glide.with(view.context).load(imgUrl).transform(CenterCrop()).into(view.findViewById(R.id.episode_image))
    }
    override fun onUnbindViewHolder(viewHolder: ViewHolder) {}
}