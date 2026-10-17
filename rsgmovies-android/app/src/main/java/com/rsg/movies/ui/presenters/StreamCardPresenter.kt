package com.rsg.movies.ui.presenters

import android.graphics.Color
import android.view.ViewGroup
import android.widget.TextView
import androidx.leanback.widget.Presenter
import com.rsg.movies.data.model.VideoItem

class StreamCardPresenter : Presenter() {
    override fun onCreateViewHolder(parent: ViewGroup): ViewHolder {
        val view = TextView(parent.context).apply {
            layoutParams = ViewGroup.LayoutParams(350, 140)
            isFocusable = true
            isFocusableInTouchMode = true
            setBackgroundColor(Color.parseColor("#1E293B"))
            setTextColor(Color.WHITE)
            gravity = android.view.Gravity.CENTER
            setPadding(16, 16, 16, 16)

            setOnFocusChangeListener { v, hasFocus ->
                v.setBackgroundColor(Color.parseColor(if (hasFocus) "#EF4444" else "#1E293B"))
                v.animate().scaleX(if (hasFocus) 1.05f else 1.0f).scaleY(if (hasFocus) 1.05f else 1.0f).start()
            }
        }
        return ViewHolder(view)
    }
    override fun onBindViewHolder(viewHolder: ViewHolder, item: Any) {
        val video = item as VideoItem
        (viewHolder.view as TextView).text = "${video.server}\n${video.lang ?: ""}"
    }
    override fun onUnbindViewHolder(viewHolder: ViewHolder) {}
}