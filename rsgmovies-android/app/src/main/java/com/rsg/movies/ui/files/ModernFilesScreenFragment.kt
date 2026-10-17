package com.rsg.movies.ui.files

import android.app.Dialog
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.Window
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import android.app.AlertDialog
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.rsg.movies.R
import com.rsg.movies.api.FolderFileItem
import com.rsg.movies.data.ConfigManager
import com.rsg.movies.data.api.ApiClient
import com.rsg.movies.data.model.Folder
import com.rsg.movies.ui.player.PlayerActivity
import kotlinx.coroutines.launch

class ModernFilesScreenFragment : Fragment() {

    private lateinit var tvUsageText: TextView
    private lateinit var pbStorageMeter: ProgressBar
    private lateinit var btnRefresh: Button
    private lateinit var btnAddTorrent: Button
    private lateinit var rvFolders: RecyclerView
    private lateinit var pbLoading: ProgressBar
    private lateinit var tvEmpty: TextView

    private val folderList = mutableListOf<Folder>()
    private lateinit var folderAdapter: FolderListAdapter

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_files_modern, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        tvUsageText = view.findViewById(R.id.tv_storage_usage_text)
        pbStorageMeter = view.findViewById(R.id.pb_storage_meter)
        btnRefresh = view.findViewById(R.id.btn_files_refresh)
        btnAddTorrent = view.findViewById(R.id.btn_files_add_torrent)
        rvFolders = view.findViewById(R.id.rv_files_folders)
        pbLoading = view.findViewById(R.id.pb_files_loading)
        tvEmpty = view.findViewById(R.id.tv_files_empty)

        rvFolders.layoutManager = LinearLayoutManager(requireContext())
        folderAdapter = FolderListAdapter(
            folderList,
            onFolderClick = { folder ->
                val intent = Intent(requireContext(), FolderDetailActivity::class.java).apply {
                    putExtra("folder_data", folder)
                    putExtra("folder_id", folder.id.toString())
                    putExtra("folder_name", folder.name)
                }
                startActivity(intent)
            },
            onDeleteClick = { folder, pos ->
                confirmDeleteFolder(folder, pos)
            }
        )
        rvFolders.adapter = folderAdapter

        btnRefresh.setOnClickListener {
            loadFilesData()
        }

        btnAddTorrent.setOnClickListener {
            showAddTorrentDialog()
        }

        loadFilesData()
    }

    private fun loadFilesData() {
        val token = ConfigManager.getAuthToken(requireContext())
        if (token.isNullOrBlank()) return

        pbLoading.visibility = View.VISIBLE
        tvEmpty.visibility = View.GONE

        lifecycleScope.launch {
            try {
                val resp = ApiClient.filesApi.getFolders("Bearer $token")
                pbLoading.visibility = View.GONE
                folderList.clear()

                val spaceUsed = resp.space_used ?: 0L
                val spaceMax = if ((resp.space_max ?: 0L) > 0) resp.space_max!! else 2147483648L // 2GB

                val usedMb = spaceUsed / (1024 * 1024)
                val maxGb = String.format("%.1f", spaceMax.toDouble() / (1024 * 1024 * 1024))
                val percent = if (spaceMax > 0) ((spaceUsed.toDouble() / spaceMax) * 100).toInt() else 0

                tvUsageText.text = "${usedMb} MB used of ${maxGb} GB (${percent}%)"
                pbStorageMeter.progress = percent

                if (resp.folders.isNotEmpty()) {
                    folderList.addAll(resp.folders)
                    folderAdapter.notifyDataSetChanged()
                    tvEmpty.visibility = View.GONE
                    rvFolders.visibility = View.VISIBLE
                    rvFolders.requestFocus()
                } else {
                    tvEmpty.visibility = View.VISIBLE
                    rvFolders.visibility = View.GONE
                }
            } catch (e: Exception) {
                pbLoading.visibility = View.GONE
                tvEmpty.visibility = View.VISIBLE
                tvEmpty.text = "Failed to load files: ${e.localizedMessage}"
            }
        }
    }

    private fun showAddTorrentDialog() {
        val input = EditText(requireContext()).apply {
            hint = "magnet:?xt=urn:btih:... or torrent URL"
            setTextColor(resources.getColor(R.color.text_white))
            setHintTextColor(resources.getColor(R.color.text_muted))
            setPadding(30, 30, 30, 30)
        }

        AlertDialog.Builder(requireContext(), android.R.style.Theme_DeviceDefault_Dialog_Alert)
            .setTitle("Add Torrent / Magnet Link")
            .setView(input)
            .setPositiveButton("Add") { _, _ ->
                val link = input.text.toString().trim()
                if (link.isNotBlank()) {
                    addTorrentLink(link)
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun addTorrentLink(link: String) {
        val token = "Bearer ${ConfigManager.getAuthToken(requireContext()) ?: ""}"
        lifecycleScope.launch {
            try {
                Toast.makeText(requireContext(), "Adding torrent...", Toast.LENGTH_SHORT).show()
                val resp = ApiClient.filesApi.addTorrent(token, link)
                if (resp.isSuccessful) {
                    Toast.makeText(requireContext(), "Torrent added successfully!", Toast.LENGTH_SHORT).show()
                    loadFilesData()
                } else {
                    Toast.makeText(requireContext(), "Could not add torrent", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "Error: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun confirmDeleteFolder(folder: Folder, position: Int) {
        AlertDialog.Builder(requireContext(), android.R.style.Theme_DeviceDefault_Dialog_Alert)
            .setTitle("Delete Folder")
            .setMessage("Are you sure you want to delete \"${folder.name}\"? This action cannot be undone.")
            .setPositiveButton("Delete") { _, _ ->
                val token = "Bearer ${ConfigManager.getAuthToken(requireContext()) ?: ""}"
                lifecycleScope.launch {
                    try {
                        var resp = ApiClient.filesApi.deleteFolder(token, folder.id.toString())
                        if (!resp.isSuccessful) {
                            resp = ApiClient.filesApi.deleteFolderGet(token, folder.id.toString())
                        }
                        if (resp.isSuccessful) {
                            val pos = folderList.indexOfFirst { it.id == folder.id }
                            if (pos != -1) {
                                folderList.removeAt(pos)
                                folderAdapter.notifyItemRemoved(pos)
                            }
                            Toast.makeText(requireContext(), "Folder deleted", Toast.LENGTH_SHORT).show()
                        } else {
                            Toast.makeText(requireContext(), "Failed to delete folder", Toast.LENGTH_SHORT).show()
                        }
                    } catch (e: Exception) {
                        try {
                            val resp2 = ApiClient.filesApi.deleteFolderGet(token, folder.id.toString())
                            if (resp2.isSuccessful) {
                                val pos = folderList.indexOfFirst { it.id == folder.id }
                                if (pos != -1) {
                                    folderList.removeAt(pos)
                                    folderAdapter.notifyItemRemoved(pos)
                                }
                                Toast.makeText(requireContext(), "Folder deleted", Toast.LENGTH_SHORT).show()
                            } else {
                                Toast.makeText(requireContext(), "Error: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
                            }
                        } catch (e2: Exception) {
                            Toast.makeText(requireContext(), "Error: ${e2.localizedMessage}", Toast.LENGTH_SHORT).show()
                        }
                    }
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
}
