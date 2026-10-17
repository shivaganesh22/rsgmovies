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
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
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

class FolderDetailActivity : AppCompatActivity() {

    private lateinit var btnBack: Button
    private lateinit var tvTitle: TextView
    private lateinit var rvFiles: RecyclerView
    private lateinit var pbLoading: ProgressBar
    private lateinit var tvEmpty: TextView

    private val filesList = mutableListOf<FolderFileItem>()
    private lateinit var filesAdapter: FileListAdapter
    private var folderData: Folder? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_folder_files_modern)

        folderData = intent.getParcelableExtra("folder_data")
        val folderId = folderData?.id?.toString() ?: intent.getStringExtra("folder_id") ?: ""
        val folderName = folderData?.name ?: intent.getStringExtra("folder_name") ?: "Folder"

        btnBack = findViewById(R.id.btn_folder_back)
        tvTitle = findViewById(R.id.tv_folder_title)
        rvFiles = findViewById(R.id.rv_folder_files)
        pbLoading = findViewById(R.id.pb_folder_loading)
        tvEmpty = findViewById(R.id.tv_folder_empty)

        tvTitle.text = folderName
        btnBack.setOnClickListener { finish() }

        rvFiles.layoutManager = LinearLayoutManager(this)
        filesAdapter = FileListAdapter(filesList) { file ->
            resolveAndPlayFile(file)
        }
        rvFiles.adapter = filesAdapter

        if (folderId.isNotBlank()) {
            loadFolderFiles(folderId)
        } else {
            finish()
        }
    }

    private fun loadFolderFiles(folderId: String) {
        val token = "Bearer ${ConfigManager.getAuthToken(this) ?: ""}"
        pbLoading.visibility = View.VISIBLE
        tvEmpty.visibility = View.GONE

        lifecycleScope.launch {
            try {
                val resp = ApiClient.folderService.openFolder(token, folderId)
                pbLoading.visibility = View.GONE
                filesList.clear()

                if (resp.files.isNotEmpty()) {
                    filesList.addAll(resp.files)
                    filesAdapter.notifyDataSetChanged()
                    tvEmpty.visibility = View.GONE
                    rvFiles.visibility = View.VISIBLE
                    rvFiles.requestFocus()
                } else {
                    tvEmpty.visibility = View.VISIBLE
                    rvFiles.visibility = View.GONE
                }
            } catch (e: Exception) {
                pbLoading.visibility = View.GONE
                tvEmpty.visibility = View.VISIBLE
                tvEmpty.text = "Failed to load folder: ${e.localizedMessage}"
            }
        }
    }

    private fun resolveAndPlayFile(file: FolderFileItem) {
        val token = "Bearer ${ConfigManager.getAuthToken(this) ?: ""}"
        val fileId = (file.folder_file_id ?: file.file_id ?: file.id).toString()

        pbLoading.visibility = View.VISIBLE
        lifecycleScope.launch {
            try {
                var streamUrl = ""
                try {
                    val playerResp = ApiClient.folderService.getFolderFilePlayer(token, fileId)
                    streamUrl = playerResp.getEffectiveStreamUrl()
                } catch (_: Exception) {}

                if (streamUrl.isBlank()) {
                    try {
                        val playerResp = ApiClient.folderService.getFilePlayer(token, fileId)
                        streamUrl = playerResp.getEffectiveStreamUrl()
                    } catch (_: Exception) {}
                }

                pbLoading.visibility = View.GONE
                if (streamUrl.isNotBlank()) {
                    showStreamActionModal(streamUrl, file.name)
                } else {
                    Toast.makeText(this@FolderDetailActivity, "Could not resolve stream URL", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                pbLoading.visibility = View.GONE
                Toast.makeText(this@FolderDetailActivity, "Error: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun showStreamActionModal(streamUrl: String, title: String) {
        val dialog = Dialog(this)
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE)
        dialog.setContentView(R.layout.dialog_stream_action)
        dialog.window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))

        val tvModalTitle = dialog.findViewById<TextView>(R.id.tv_modal_title)
        val tvModalSubtitle = dialog.findViewById<TextView>(R.id.tv_modal_subtitle)
        val btnVlc = dialog.findViewById<Button>(R.id.btn_modal_vlc)
        val btnMx = dialog.findViewById<Button>(R.id.btn_modal_mx)
        val btnPlayApp = dialog.findViewById<Button>(R.id.btn_modal_play_app)
        val btnCopy = dialog.findViewById<Button>(R.id.btn_modal_copy)
        val btnDownload = dialog.findViewById<Button>(R.id.btn_modal_download)
        val btnCancel = dialog.findViewById<Button>(R.id.btn_modal_cancel)

        tvModalTitle.text = title
        tvModalSubtitle.text = "Seedr Cloud Stream"

        // 1. VLC Player
        btnVlc.setOnClickListener {
            dialog.dismiss()
            openExternalPlayer(streamUrl, "org.videolan.vlc")
        }

        // 2. MX Player
        btnMx.setOnClickListener {
            dialog.dismiss()
            openExternalPlayer(streamUrl, "com.mxtech.videoplayer.ad")
        }

        // 3. Built-in App Player
        btnPlayApp.setOnClickListener {
            dialog.dismiss()
            val intent = Intent(this, PlayerActivity::class.java).apply {
                putExtra("VIDEO_URL", streamUrl)
                putExtra("MEDIA_TITLE", title)
            }
            startActivity(intent)
        }

        // 4. Copy URL
        btnCopy.setOnClickListener {
            val clip = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            clip.setPrimaryClip(ClipData.newPlainText("Stream URL", streamUrl))
            Toast.makeText(this, "Stream URL copied to clipboard", Toast.LENGTH_SHORT).show()
            dialog.dismiss()
        }

        // 5. Download (Open in Browser)
        btnDownload?.setOnClickListener {
            dialog.dismiss()
            try {
                val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(streamUrl)).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                startActivity(browserIntent)
            } catch (e: Exception) {
                Toast.makeText(this, "Could not open browser: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            }
        }

        btnCancel.setOnClickListener {
            dialog.dismiss()
        }

        btnVlc.requestFocus()
        dialog.show()
    }

    private fun openExternalPlayer(url: String, packageName: String) {
        try {
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(Uri.parse(url), "video/*")
                setPackage(packageName)
            }
            startActivity(intent)
        } catch (_: Exception) {
            val genericIntent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(Uri.parse(url), "video/*")
            }
            startActivity(Intent.createChooser(genericIntent, "Open with Video Player"))
        }
    }

    class FileListAdapter(
        private val files: List<FolderFileItem>,
        private val onFileClick: (FolderFileItem) -> Unit
    ) : RecyclerView.Adapter<FileListAdapter.ViewHolder>() {

        class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
            val tvName: TextView = view.findViewById(R.id.tv_file_name)
            val tvMeta: TextView = view.findViewById(R.id.tv_file_meta)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
            val view = LayoutInflater.from(parent.context).inflate(R.layout.item_file_modern, parent, false)
            return ViewHolder(view)
        }

        override fun onBindViewHolder(holder: ViewHolder, position: Int) {
            val file = files[position]
            holder.tvName.text = file.name

            val sizeMb = file.size / (1024 * 1024)
            holder.tvMeta.text = if (sizeMb > 1024) {
                String.format("%.1f GB • Click to play", sizeMb.toDouble() / 1024)
            } else {
                "$sizeMb MB • Click to play"
            }

            holder.itemView.setOnClickListener {
                onFileClick(file)
            }
        }

        override fun getItemCount(): Int = files.size
    }
}
