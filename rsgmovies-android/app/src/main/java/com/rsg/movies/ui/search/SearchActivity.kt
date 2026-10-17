package com.rsg.movies.ui.search

import android.content.Intent
import android.os.Bundle
import androidx.fragment.app.FragmentActivity
import com.rsg.movies.R

class SearchActivity : FragmentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val frameLayout = android.widget.FrameLayout(this).apply {
            id = android.view.View.generateViewId()
        }
        setContentView(frameLayout)

        if (savedInstanceState == null) {
            supportFragmentManager.beginTransaction()
                .replace(frameLayout.id, SearchFragment())
                .commit()
        }
    }

    // Handles the native Android TV Voice Search intent
    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        setIntent(intent)
        val fragment = supportFragmentManager.findFragmentById(android.R.id.content) as? SearchFragment
        fragment?.let {
            if (intent?.action == Intent.ACTION_SEARCH) {
                val query = intent.getStringExtra(android.app.SearchManager.QUERY)
                it.setSearchQuery(query, true)
            }
        }
    }
}