package com.rsg.movies.ui

import android.app.Activity
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.rsg.movies.R
import java.lang.ref.WeakReference

object TvFocusHelper {

    private var lastFocusedContentView: WeakReference<View>? = null

    fun rememberLastFocusedContent(view: View?) {
        if (view != null) {
            lastFocusedContentView = WeakReference(view)
        }
    }

    fun restoreLastFocusedContent(): Boolean {
        val view = lastFocusedContentView?.get()
        if (view != null && view.isAttachedToWindow && view.isShown) {
            view.requestFocus()
            val pad = (30 * view.resources.displayMetrics.density).toInt()
            val rect = android.graphics.Rect(0, -pad, view.width, view.height + pad)
            view.requestRectangleOnScreen(rect, false)
            return true
        }
        return false
    }

    fun clearFocusMemory() {
        lastFocusedContentView = null
    }

    @JvmOverloads
    fun focusSidebar(activity: Activity?, fromView: View? = null) {
        if (activity == null) return
        if (fromView != null) {
            rememberLastFocusedContent(fromView)
        }

        val navHome = activity.findViewById<View>(R.id.nav_home)
        val navMovies = activity.findViewById<View>(R.id.nav_movies)
        val navSeries = activity.findViewById<View>(R.id.nav_series)
        val navSearch = activity.findViewById<View>(R.id.nav_search)
        val navFiles = activity.findViewById<View>(R.id.nav_files)
        val navSettings = activity.findViewById<View>(R.id.nav_settings)

        val navList = listOf(navHome, navMovies, navSeries, navSearch, navFiles, navSettings)
        val selected = navList.firstOrNull { it?.isSelected == true }
        if (selected != null) {
            selected.requestFocus()
        } else {
            navHome?.requestFocus()
        }
    }

    @JvmOverloads
    fun attachHorizontalRowFocus(
        recyclerView: RecyclerView,
        onLeftAtStart: (() -> Unit)? = null,
        onUpAtStart: (() -> Unit)? = null
    ) {
        val context = recyclerView.context
        val customLayoutManager = object : LinearLayoutManager(context, HORIZONTAL, false) {
            override fun onInterceptFocusSearch(focused: View, direction: Int): View? {
                val currentPos = getPosition(focused)
                if (currentPos == RecyclerView.NO_POSITION) {
                    return super.onInterceptFocusSearch(focused, direction)
                }

                if (direction == View.FOCUS_LEFT) {
                    if (currentPos > 0) {
                        val targetPos = currentPos - 1
                        scrollToPosition(targetPos)
                        val target = findViewByPosition(targetPos)
                        return target ?: focused
                    } else {
                        // At start of row
                        rememberLastFocusedContent(focused)
                        if (onLeftAtStart != null) {
                            onLeftAtStart.invoke()
                            return focused
                        }
                        return focused
                    }
                } else if (direction == View.FOCUS_RIGHT) {
                    if (currentPos < itemCount - 1) {
                        val targetPos = currentPos + 1
                        scrollToPosition(targetPos)
                        val target = findViewByPosition(targetPos)
                        return target ?: focused
                    } else {
                        // At end of row: prevent jumping to other rows
                        return focused
                    }
                }

                return super.onInterceptFocusSearch(focused, direction)
            }
        }

        recyclerView.layoutManager = customLayoutManager

        recyclerView.addOnChildAttachStateChangeListener(object : RecyclerView.OnChildAttachStateChangeListener {
            override fun onChildViewAttachedToWindow(view: View) {
                view.setOnKeyListener { v, keyCode, event ->
                    if (event.action == KeyEvent.ACTION_DOWN) {
                        val pos = recyclerView.getChildAdapterPosition(v)
                        if (pos != RecyclerView.NO_POSITION) {
                            val count = recyclerView.adapter?.itemCount ?: 0
                            if (keyCode == KeyEvent.KEYCODE_DPAD_UP && onUpAtStart != null) {
                                onUpAtStart.invoke()
                                return@setOnKeyListener true
                            } else if (keyCode == KeyEvent.KEYCODE_DPAD_LEFT) {
                                if (pos == 0) {
                                    rememberLastFocusedContent(v)
                                    if (onLeftAtStart != null) {
                                        onLeftAtStart.invoke()
                                    }
                                    return@setOnKeyListener true
                                } else if (pos > 0) {
                                    val target = pos - 1
                                    recyclerView.smoothScrollToPosition(target)
                                    recyclerView.post {
                                        recyclerView.findViewHolderForAdapterPosition(target)?.itemView?.requestFocus()
                                    }
                                    return@setOnKeyListener true
                                }
                            } else if (keyCode == KeyEvent.KEYCODE_DPAD_RIGHT) {
                                if (pos < count - 1) {
                                    val target = pos + 1
                                    recyclerView.smoothScrollToPosition(target)
                                    recyclerView.post {
                                        recyclerView.findViewHolderForAdapterPosition(target)?.itemView?.requestFocus()
                                    }
                                    return@setOnKeyListener true
                                } else {
                                    // At last item: stay on last item
                                    return@setOnKeyListener true
                                }
                            }
                        }
                    }
                    false
                }
            }

            override fun onChildViewDetachedFromWindow(view: View) {
                view.setOnKeyListener(null)
            }
        })
    }

    /**
     * Attaches layout manager and key listeners for grids so that:
     * 1. Pressing LEFT on the leftmost column opens sidebar.
     * 2. Pressing RIGHT on the rightmost column stays in place without jumping up to filters or other rows.
     */
    @JvmOverloads
    fun attachGridFocus(
        recyclerView: RecyclerView,
        spanCount: Int,
        onLeftAtStart: (() -> Unit)? = null
    ) {
        val context = recyclerView.context
        val customLayoutManager = object : androidx.recyclerview.widget.GridLayoutManager(context, spanCount) {
            override fun onInterceptFocusSearch(focused: View, direction: Int): View? {
                val currentPos = getPosition(focused)
                if (currentPos == RecyclerView.NO_POSITION) {
                    return super.onInterceptFocusSearch(focused, direction)
                }

                if (direction == View.FOCUS_LEFT && (currentPos % spanCount == 0)) {
                    rememberLastFocusedContent(focused)
                    if (onLeftAtStart != null) {
                        onLeftAtStart.invoke()
                        return focused
                    }
                    return focused
                } else if (direction == View.FOCUS_RIGHT && ((currentPos + 1) % spanCount == 0 || currentPos == itemCount - 1)) {
                    // Right edge of grid: stay on current item, never jump to filters
                    return focused
                }

                return super.onInterceptFocusSearch(focused, direction)
            }
        }

        recyclerView.layoutManager = customLayoutManager

        recyclerView.addOnChildAttachStateChangeListener(object : RecyclerView.OnChildAttachStateChangeListener {
            override fun onChildViewAttachedToWindow(view: View) {
                view.setOnKeyListener { v, keyCode, event ->
                    if (event.action == KeyEvent.ACTION_DOWN) {
                        val pos = recyclerView.getChildAdapterPosition(v)
                        if (pos != RecyclerView.NO_POSITION) {
                            val count = recyclerView.adapter?.itemCount ?: 0
                            if (keyCode == KeyEvent.KEYCODE_DPAD_LEFT && (pos % spanCount == 0)) {
                                rememberLastFocusedContent(v)
                                onLeftAtStart?.invoke()
                                return@setOnKeyListener true
                            } else if (keyCode == KeyEvent.KEYCODE_DPAD_RIGHT && ((pos + 1) % spanCount == 0 || pos == count - 1)) {
                                // Right edge of grid: consume event so focus does not jump to filters
                                return@setOnKeyListener true
                            }
                        }
                    }
                    false
                }
            }

            override fun onChildViewDetachedFromWindow(view: View) {
                view.setOnKeyListener(null)
            }
        })
    }
}
