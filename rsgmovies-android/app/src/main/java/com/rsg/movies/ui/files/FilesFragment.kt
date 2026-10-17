package com.rsg.movies.ui.files

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.View
import android.widget.Toast
import androidx.leanback.app.BrowseSupportFragment
import androidx.leanback.app.VerticalGridSupportFragment
import androidx.leanback.widget.ArrayObjectAdapter
import androidx.leanback.widget.FocusHighlight
import androidx.leanback.widget.OnItemViewClickedListener
import androidx.leanback.widget.VerticalGridPresenter
import com.rsg.movies.api.RetrofitInstance
import com.rsg.movies.data.model.Folder
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
class FilesFragment : VerticalGridSupportFragment(),
    BrowseSupportFragment.MainFragmentAdapterProvider {  // ← ADD THIS

    private val mMainFragmentAdapter = BrowseSupportFragment.MainFragmentAdapter(this)  // ← ADD THIS

    override fun getMainFragmentAdapter(): BrowseSupportFragment.MainFragmentAdapter<*> {  // ← ADD THIS
        return mMainFragmentAdapter
    }

    private val numberOfColumns = 1
    private lateinit var gridAdapter: ArrayObjectAdapter
    private val handler = Handler(Looper.getMainLooper())
    // ... rest stays the same


    private val apiFetchRunnable = object : Runnable {
        override fun run() {
            loadFolders()
            handler.postDelayed(this, 10000)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Grid presenter MUST be set in onCreate before view is created
        val gridPresenter = VerticalGridPresenter(FocusHighlight.ZOOM_FACTOR_MEDIUM, false)
        gridPresenter.numberOfColumns = numberOfColumns
        setGridPresenter(gridPresenter)

        // Adapter MUST also be set in onCreate
        gridAdapter = ArrayObjectAdapter(FolderPresenter { deletedFolder ->
            gridAdapter.remove(deletedFolder)
        })
        adapter = gridAdapter
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        // Click listener and data loading AFTER view + adapter lifecycle is ready
        setOnItemViewClickedListener { _, item, _, _ ->
            if (item is Folder) {
                val intent = Intent(requireContext(), FolderDetailActivity::class.java).apply {
                    putExtra("folder_data", item)
                }
                startActivity(intent)
            }
        }

        loadFolders()
        handler.postDelayed(apiFetchRunnable, 20000)
    }

    private fun loadFolders() {
        val token = com.rsg.movies.data.ConfigManager.getAuthToken(requireContext())
        if (token.isNullOrBlank()) return

        CoroutineScope(Dispatchers.IO).launch {
            try {
                Log.d("FoldersResponse", "Fetching folders...")
                val response = RetrofitInstance.api.getFolders("Bearer $token")
                Log.d("FoldersResponse", "$response")
                if (response.folders.isNotEmpty()) {
                    withContext(Dispatchers.Main) {
                        gridAdapter.clear()
                        gridAdapter.addAll(0, response.folders)
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    override fun onPause() {
        super.onPause()
        handler.removeCallbacks(apiFetchRunnable)
    }

    override fun onResume() {
        super.onResume()
        handler.postDelayed(apiFetchRunnable, 20000)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        handler.removeCallbacks(apiFetchRunnable)
    }
}