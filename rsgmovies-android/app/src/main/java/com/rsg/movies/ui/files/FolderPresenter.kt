package com.rsg.movies.ui.files

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.PopupMenu
import android.widget.TextView
import android.widget.Toast
import androidx.leanback.widget.Presenter
import com.rsg.movies.R
import com.rsg.movies.api.FolderService
import com.rsg.movies.data.model.Folder
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class FolderPresenter(private val onDeleteCallback: ((Folder) -> Unit)? = null) : Presenter() {
    private fun getAuthToken(context: Context): String {
        return "Bearer ${com.rsg.movies.data.ConfigManager.getAuthToken(context) ?: ""}"
    }

    override fun onCreateViewHolder(parent: ViewGroup): ViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.folder_item, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(viewHolder: ViewHolder, item: Any) {
        val folder = item as Folder
        val view = viewHolder.view

        val textView = view.findViewById<TextView>(R.id.folder_name)
        val menuButton = view.findViewById<ImageView>(R.id.menu_button)

        textView.text = folder.name
        textView.isFocusable = true
        textView.isFocusableInTouchMode = true
        menuButton.isFocusable = true
        menuButton.isFocusableInTouchMode = true
        menuButton.setOnClickListener { v ->
            showPopupMenu(v.context, v, folder)
        }
    }

    private fun showPopupMenu(context: Context, anchorView: View, folder: Folder) {
        val popupMenu = PopupMenu(context, anchorView)
        popupMenu.menuInflater.inflate(R.menu.folder_item_menu, popupMenu.menu)

        popupMenu.setOnMenuItemClickListener { menuItem ->
            when (menuItem.itemId) {
                R.id.menu_play -> {
                    fetchAndPlayVideo(context, folder)
                    true
                }
                R.id.menu_play_mxplayer -> {
                    fetchAndPlayWithExternalPlayer(context, folder.id, "mx")
                    true
                }
                R.id.menu_play_vlc -> {
                    fetchAndPlayWithExternalPlayer(context, folder.id, "vlc")
                    true
                }
                R.id.menu_copy -> {
                    fetchAndCopyUrl(context, folder.id)
                    true
                }
                R.id.menu_download -> {
                    fetchAndOpenDownloadUrl(context, folder.id)
                    true
                }
                R.id.menu_delete -> {
                    confirmDeleteFolder(context, folder)
                    true
                }
                else -> false
            }
        }

        popupMenu.show()
    }

    private fun confirmDeleteFolder(context: Context, folder: Folder) {
        android.app.AlertDialog.Builder(context, android.R.style.Theme_DeviceDefault_Dialog_Alert)
            .setTitle("Delete Folder")
            .setMessage("Are you sure you want to delete \"${folder.name}\"? This action cannot be undone.")
            .setPositiveButton("Delete") { _, _ ->
                val token = getAuthToken(context)
                CoroutineScope(Dispatchers.IO).launch {
                    try {
                        val response = com.rsg.movies.data.api.ApiClient.filesApi.deleteFolder(token, folder.id.toString())
                        withContext(Dispatchers.Main) {
                            if (response.isSuccessful) {
                                Toast.makeText(context, "Folder deleted successfully", Toast.LENGTH_SHORT).show()
                                onDeleteCallback?.invoke(folder)
                            } else {
                                Toast.makeText(context, "Failed to delete folder", Toast.LENGTH_SHORT).show()
                            }
                        }
                    } catch (e: Exception) {
                        withContext(Dispatchers.Main) {
                            Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
                        }
                    }
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun fetchAndPlayVideo(context: Context, folder: Folder) {
        val intent = Intent(context, FolderDetailActivity::class.java).apply {
            putExtra("folder_data", folder)
        }
        context.startActivity(intent)
    }
    private fun fetchAndPlayWithExternalPlayer(context: Context, folderId: Long, playerType: String) {
        val retrofit = Retrofit.Builder()
            .baseUrl("https://rsg-movies.vercel.app/")
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        val service = retrofit.create(FolderService::class.java)

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val response = service.getFolderFiles(getAuthToken(context), folderId.toInt())
                if (response.result) {
                    withContext(Dispatchers.Main) {
                        when (playerType) {
                            "mx" -> openWithMxPlayer(context, response.url,response.name)
                            "vlc" -> openWithVlcPlayer(context, response.url)
                        }
                    }
                } else {
                    withContext(Dispatchers.Main) {
                        Toast.makeText(context, "Failed to load video", Toast.LENGTH_SHORT).show()
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    Toast.makeText(context, "Error fetching video", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun fetchAndOpenDownloadUrl(context: Context, folderId: Long) {
        val retrofit = Retrofit.Builder()
            .baseUrl("https://rsg-movies.vercel.app/")
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        val service = retrofit.create(FolderService::class.java)

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val response = service.getFolderFiles(getAuthToken(context), folderId.toInt())
                if (response.result) {
                    withContext(Dispatchers.Main) {
                        openUrlInBrowser(context, response.url)
                    }
                } else {
                    withContext(Dispatchers.Main) {
                        Toast.makeText(context, "Failed to get download URL", Toast.LENGTH_SHORT).show()
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    Toast.makeText(context, "Error fetching download URL", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
    private fun fetchAndCopyUrl(context: Context, folderId: Long) {
        val retrofit = Retrofit.Builder()
            .baseUrl("https://rsg-movies.vercel.app/")
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        val service = retrofit.create(FolderService::class.java)

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val response = service.getFolderFiles(getAuthToken(context), folderId.toInt())
                if (response.result) {
                    withContext(Dispatchers.Main) {
                        copyUrl(context, response.url)
                    }
                } else {
                    withContext(Dispatchers.Main) {
                        Toast.makeText(context, "Failed to get download URL", Toast.LENGTH_SHORT).show()
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    Toast.makeText(context, "Error fetching download URL", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun openAppInStore(context: Context, packageName: String) {
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=$packageName"))
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
        } catch (e: Exception) {
            Toast.makeText(context, "Unable to open Play Store", Toast.LENGTH_SHORT).show()
        }
    }


    private fun openWithMxPlayer(context: Context, videoUrl: String,name:String) {


        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(Uri.parse(videoUrl), "video/*")
            putExtra("title", name) // Optional: Set video title
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }

        try {
            // Try launching the free version
            intent.setPackage("com.mxtech.videoplayer.ad")
            context.startActivity(intent)
        } catch (e: Exception) {
            try {
                // Try launching the pro version
                intent.setPackage("com.mxtech.videoplayer.pro")
                context.startActivity(intent)
            } catch (e: Exception) {
                // Redirect to Play Store if neither version is installed
                openAppInStore(context, "com.mxtech.videoplayer.ad")
            }
        }
    }



    private fun openWithVlcPlayer(context: Context, videoUrl: String) {
        try {
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setPackage("org.videolan.vlc") // VLC package name
                setDataAndType(Uri.parse(videoUrl), "video/*")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            // Redirect to Play Store if VLC is not installed
            openAppInStore(context, "org.videolan.vlc")
        }
    }

    private fun copyUrl(context: Context, url: String) {
        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = ClipData.newPlainText("Video URL", url)
        clipboard.setPrimaryClip(clip)

        Toast.makeText(context, "URL copied to clipboard", Toast.LENGTH_SHORT).show()
    }

    private fun openUrlInBrowser(context: Context, url: String) {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
        context.startActivity(intent)
    }

    override fun onUnbindViewHolder(viewHolder: ViewHolder) {
        // Clean up if needed
    }
}