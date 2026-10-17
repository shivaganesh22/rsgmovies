package com.rsg.movies.ui.presenters

import android.graphics.Color
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.TextView
import androidx.leanback.widget.Presenter
import com.bumptech.glide.Glide
import com.bumptech.glide.load.resource.bitmap.CenterCrop
import com.rsg.movies.data.model.EpisodeItem

class SeriesEpisodePresenter : Presenter() {
    override fun onCreateViewHolder(parent: ViewGroup): ViewHolder {
        val layout = FrameLayout(parent.context).apply {
            layoutParams = ViewGroup.LayoutParams(320, 180)
            isFocusable = true
            isFocusableInTouchMode = true

            val img = ImageView(context).apply {
                layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
            }

            val overlay = android.view.View(context).apply {
                layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
                setBackgroundColor(Color.parseColor("#80000000"))
            }

            val title = TextView(context).apply {
                layoutParams = FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
                    gravity = android.view.Gravity.BOTTOM
                }
                setTextColor(Color.WHITE)
                textSize = 12f
                setPadding(16, 16, 16, 16)
                maxLines = 2
            }

            addView(img)
            addView(overlay)
            addView(title)

            setOnFocusChangeListener { v, hasFocus ->
                v.animate().scaleX(if (hasFocus) 1.05f else 1.0f).scaleY(if (hasFocus) 1.05f else 1.0f).start()
                title.setTextColor(Color.parseColor(if (hasFocus) "#EF4444" else "#FFFFFF"))
                overlay.setBackgroundColor(Color.parseColor(if (hasFocus) "#40000000" else "#80000000"))
            }
        }
        return ViewHolder(layout)
    }

    override fun onBindViewHolder(viewHolder: ViewHolder, item: Any) {
        val ep = item as EpisodeItem
        val layout = viewHolder.view as FrameLayout
        val img = layout.getChildAt(0) as ImageView
        val title = layout.getChildAt(2) as TextView

        title.text = "E${ep.episode_number ?: 1} : ${ep.name ?: "Episode"}"

        val url = ep.still_path_tv?.replace("http://", "https://")
        Glide.with(layout.context).load(url).transform(CenterCrop()).into(img)
    }

    override fun onUnbindViewHolder(viewHolder: ViewHolder) {}
}