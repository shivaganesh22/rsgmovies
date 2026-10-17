package com.rsg.movies.ui.presenters

import android.graphics.Color
import android.view.Gravity
import android.view.ViewGroup
import android.widget.TextView
import androidx.leanback.widget.Presenter
import com.rsg.movies.data.model.SeasonItem

class SeasonPresenter : Presenter() {
    override fun onCreateViewHolder(parent: ViewGroup): ViewHolder {
        val view = TextView(parent.context).apply {
            layoutParams = ViewGroup.LayoutParams(250, 100)
            isFocusable = true
            isFocusableInTouchMode = true
            gravity = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#1E293B"))
            setTextColor(Color.WHITE)
            textSize = 16f

            setOnFocusChangeListener { v, hasFocus ->
                v.setBackgroundColor(Color.parseColor(if (hasFocus) "#EF4444" else "#1E293B"))
                v.animate().scaleX(if (hasFocus) 1.05f else 1.0f).scaleY(if (hasFocus) 1.05f else 1.0f).start()
            }
        }
        return ViewHolder(view)
    }

    override fun onBindViewHolder(viewHolder: ViewHolder, item: Any) {
        val season = item as SeasonItem
        (viewHolder.view as TextView).text = season.name ?: "Season ${season.season_number}"
    }

    override fun onUnbindViewHolder(viewHolder: ViewHolder) {}
}