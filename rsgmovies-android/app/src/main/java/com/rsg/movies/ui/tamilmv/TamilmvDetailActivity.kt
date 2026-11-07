package com.rsg.movies.ui.tamilmv

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.core.widget.NestedScrollView
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.rsg.movies.R
import com.rsg.movies.data.ConfigManager
import com.rsg.movies.data.api.ApiClient
import com.rsg.movies.data.model.TamilmvDownloadLink
import com.rsg.movies.ui.adapters.TamilmvLinkAdapter
import kotlinx.coroutines.launch

class TamilmvDetailActivity : FragmentActivity() {

    private var movieLink: String = ""
    private var movieTitle: String = ""

    private lateinit var nsvDetail: NestedScrollView
    private lateinit var pbLoading: ProgressBar
    private lateinit var tvTitle: TextView
    private lateinit var tvLinksHeader: TextView
    private lateinit var rvLinks: RecyclerView
    private lateinit var llScreenshots: LinearLayout
    private lateinit var rvImages: RecyclerView

    private val downloadLinks = mutableListOf<TamilmvDownloadLink>()
    private lateinit var linkAdapter: TamilmvLinkAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_tamilmv_detail)

        movieLink = intent.getStringExtra("LINK") ?: ""
        movieTitle = intent.getStringExtra("TITLE") ?: "TamilMV Release"

        initViews()
        loadDetails()
    }

    private fun initViews() {
        nsvDetail = findViewById(R.id.nsv_tamilmv_detail)
        pbLoading = findViewById(R.id.pb_tamilmv_detail_loading)
        tvTitle = findViewById(R.id.tv_detail_title)
        tvLinksHeader = findViewById(R.id.tv_links_header)
        rvLinks = findViewById(R.id.rv_tamilmv_links)
        llScreenshots = findViewById(R.id.ll_tamilmv_screenshots)
        rvImages = findViewById(R.id.rv_tamilmv_images)

        tvTitle.text = movieTitle
        rvLinks.layoutManager = LinearLayoutManager(this)

        linkAdapter = TamilmvLinkAdapter(
            links = downloadLinks,
            onSeedrClick = { link ->
                val magnet = link.link ?: ""
                if (magnet.isNotBlank()) {
                    addToSeedr(magnet)
                } else {
                    Toast.makeText(this, "No valid torrent magnet found", Toast.LENGTH_SHORT).show()
                }
            },
            onDirectClick = { link ->
                val direct = link.direct_link ?: ""
                if (direct.isNotBlank()) {
                    openBrowser(direct)
                }
            },
            onMagnetClick = { link ->
                val magnet = link.link ?: ""
                if (magnet.isNotBlank()) {
                    launchMagnet(magnet)
                }
            },
            onCopyClick = { link ->
                val magnet = link.link ?: ""
                if (magnet.isNotBlank()) {
                    copyToClipboard(magnet)
                }
            }
        )
        rvLinks.adapter = linkAdapter
    }

    private fun loadDetails() {
        if (movieLink.isBlank()) {
            Toast.makeText(this, "Invalid movie link", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        val cacheKey = "tamilmv_detail_$movieLink"
        val cached = com.rsg.movies.providers.ContentCache.get<com.rsg.movies.data.model.TamilmvMovieDetailResponse>(cacheKey)
        if (cached != null) {
            bindDetailData(cached)
            return
        }

        pbLoading.visibility = View.VISIBLE
        nsvDetail.visibility = View.GONE

        lifecycleScope.launch {
            try {
                val resp = ApiClient.scrapersApi.getTamilmvMovie(movieLink)
                pbLoading.visibility = View.GONE

                if (resp.isSuccessful && resp.body() != null) {
                    val body = resp.body()!!
                    com.rsg.movies.providers.ContentCache.put(cacheKey, body)
                    bindDetailData(body)
                } else {
                    nsvDetail.visibility = View.VISIBLE
                    Toast.makeText(this@TamilmvDetailActivity, "Could not load release details", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                pbLoading.visibility = View.GONE
                nsvDetail.visibility = View.VISIBLE
                Toast.makeText(this@TamilmvDetailActivity, "Error: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun bindDetailData(body: com.rsg.movies.data.model.TamilmvMovieDetailResponse) {
        pbLoading.visibility = View.GONE
        nsvDetail.visibility = View.VISIBLE

        val title = body.title?.ifBlank { null } ?: movieTitle
        tvTitle.text = title

        val links = body.links ?: emptyList()
        downloadLinks.clear()
        downloadLinks.addAll(links)
        linkAdapter.notifyDataSetChanged()

        tvLinksHeader.text = "Available Downloads & Magnet Links (${downloadLinks.size})"
    }

    private fun addToSeedr(magnetLink: String) {
        val token = "Bearer ${ConfigManager.getAuthToken(this) ?: ""}"
        Toast.makeText(this, "Adding torrent to Seedr...", Toast.LENGTH_SHORT).show()

        lifecycleScope.launch {
            try {
                val body = mapOf("link" to magnetLink)
                val resp = ApiClient.filesApi.addTorrent(token, body, magnetLink)
                if (resp.isSuccessful) {
                    Toast.makeText(this@TamilmvDetailActivity, "Torrent added to Seedr! Downloading in cloud.", Toast.LENGTH_LONG).show()
                } else {
                    val errMsg = try {
                        val errStr = resp.errorBody()?.string() ?: ""
                        val json = org.json.JSONObject(errStr)
                        json.optJSONObject("error")?.optString("message") 
                            ?: json.optString("detail") 
                            ?: json.optString("message")
                    } catch (_: Exception) { null }
                    Toast.makeText(this@TamilmvDetailActivity, errMsg ?: "Failed to add torrent to Seedr", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@TamilmvDetailActivity, "Error adding to Seedr: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun launchMagnet(magnetLink: String) {
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(magnetLink)).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            startActivity(intent)
        } catch (_: Exception) {
            copyToClipboard(magnetLink)
            Toast.makeText(this, "No torrent client found. Magnet copied to clipboard.", Toast.LENGTH_LONG).show()
        }
    }

    private fun copyToClipboard(text: String) {
        val clip = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        clip.setPrimaryClip(ClipData.newPlainText("Magnet Link", text))
        Toast.makeText(this, "Magnet link copied to clipboard!", Toast.LENGTH_SHORT).show()
    }

    private fun openBrowser(url: String) {
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            startActivity(intent)
        } catch (_: Exception) {
            Toast.makeText(this, "Could not open browser", Toast.LENGTH_SHORT).show()
        }
    }
}
