package com.rsg.movies.ui.presenters

import android.graphics.Color
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.leanback.widget.Presenter
import com.bumptech.glide.Glide
import com.bumptech.glide.load.resource.bitmap.CircleCrop
import com.rsg.movies.data.model.CastItem

class CastCardPresenter : Presenter() {
    override fun onCreateViewHolder(parent: ViewGroup): ViewHolder {
        val layout = LinearLayout(parent.context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = android.view.Gravity.CENTER
            layoutParams = ViewGroup.LayoutParams(220, 300)
            isFocusable = true
            isFocusableInTouchMode = true

            val img = ImageView(context).apply { layoutParams = LinearLayout.LayoutParams(180, 180) }
            val name = TextView(context).apply {
                setTextColor(Color.WHITE)
                textSize = 12f
                textAlignment = android.view.View.TEXT_ALIGNMENT_CENTER
                setPadding(0, 8, 0, 0)
                maxLines = 2
            }
            addView(img); addView(name)

            setOnFocusChangeListener { v, hasFocus ->
                v.animate().scaleX(if (hasFocus) 1.1f else 1.0f).scaleY(if (hasFocus) 1.1f else 1.0f).start()
                name.setTextColor(Color.parseColor(if (hasFocus) "#EF4444" else "#FFFFFF"))
            }
        }
        return ViewHolder(layout)
    }
    override fun onBindViewHolder(viewHolder: ViewHolder, item: Any) {
        val cast = item as CastItem
        val layout = viewHolder.view as LinearLayout
        val img = layout.getChildAt(0) as ImageView
        val name = layout.getChildAt(1) as TextView

        name.text = cast.name
        var imgUrl = cast.profile_path
        if (imgUrl != null && imgUrl.startsWith("http://")) imgUrl = imgUrl.replace("http://", "https://")

        Glide.with(layout.context).load(imgUrl ?: "https://via.placeholder.com/150").transform(CircleCrop()).into(img)
    }
    override fun onUnbindViewHolder(viewHolder: ViewHolder) {}
}