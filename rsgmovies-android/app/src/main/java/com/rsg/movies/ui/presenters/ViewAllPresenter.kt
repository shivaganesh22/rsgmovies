package com.rsg.movies.ui.presenters

import android.graphics.Color
import android.view.LayoutInflater
import android.view.ViewGroup
import android.widget.TextView
import androidx.leanback.widget.Presenter
import com.rsg.movies.R

class ViewAllPresenter : Presenter() {
    override fun onCreateViewHolder(parent: ViewGroup): ViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_view_all, parent, false)

        view.setOnFocusChangeListener { v, hasFocus ->
            // Match the Movie/Episode scaling exactly
            val scale = if (hasFocus) 1.05f else 1.0f
            v.animate().scaleX(scale).scaleY(scale).setDuration(200).start()

            // Text turns red on hover, white normally
            v.findViewById<TextView>(R.id.text_view_all).setTextColor(Color.parseColor(if (hasFocus) "#EF4444" else "#FFFFFF"))

            v.elevation = if (hasFocus) 8f else 0f
        }
        return ViewHolder(view)
    }

    override fun onBindViewHolder(viewHolder: ViewHolder, item: Any) {}
    override fun onUnbindViewHolder(viewHolder: ViewHolder) {}
}