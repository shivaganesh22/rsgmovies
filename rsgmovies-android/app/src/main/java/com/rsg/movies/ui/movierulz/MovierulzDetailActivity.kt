package com.rsg.movies.ui.movierulz

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.core.widget.NestedScrollView
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.rsg.movies.R
import com.rsg.movies.data.ConfigManager
import com.rsg.movies.data.api.ApiClient
import com.rsg.movies.data.model.MovierulzTorrentLink
import com.rsg.movies.ui.adapters.MovierulzLinkAdapter
import kotlinx.coroutines.launch

class MovierulzDetailActivity : FragmentActivity() {

    private var movieSlug: String = ""
    private var movieName: String = ""
    private var movieImage: String = ""
    private var movieQuality: String = ""

    private lateinit var nsvDetail: NestedScrollView
    private lateinit var pbLoading: ProgressBar
    private lateinit var ivPoster: ImageView
    private lateinit var tvQuality: TextView
    private lateinit var tvTitle: TextView
    private lateinit var tvMeta: TextView
    private lateinit var tvLinksHeader: TextView
    private lateinit var rvLinks: RecyclerView

    private val torrentLinks = mutableListOf<MovierulzTorrentLink>()
    private lateinit var linkAdapter: MovierulzLinkAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_movierulz_detail)

        movieSlug = intent.getStringExtra("SLUG") ?: ""
        movieName = intent.getStringExtra("NAME") ?: "Movierulz Movie"
        movieImage = intent.getStringExtra("IMAGE") ?: ""
        movieQuality = intent.getStringExtra("QUALITY") ?: "HD"

        initViews()
        loadDetails()
    }

    private fun initViews() {
        nsvDetail = findViewById(R.id.nsv_movierulz_detail)
        pbLoading = findViewById(R.id.pb_movierulz_detail_loading)
        ivPoster = findViewById(R.id.iv_movierulz_poster)
        tvQuality = findViewById(R.id.tv_movierulz_quality)
        tvTitle = findViewById(R.id.tv_movierulz_title)
        tvMeta = findViewById(R.id.tv_movierulz_meta)
        tvLinksHeader = findViewById(R.id.tv_movierulz_links_header)
        rvLinks = findViewById(R.id.rv_movierulz_links)

        tvTitle.text = movieName
        tvQuality.text = movieQuality
        if (movieQuality.contains("CAM", ignoreCase = true) || movieQuality.contains("PREDVD", ignoreCase = true)) {
            tvQuality.setBackgroundResource(R.drawable.badge_cam_bg)
        } else {
            tvQuality.setBackgroundResource(R.drawable.badge_hd_bg)
        }

        Glide.with(this)
            .load(movieImage.ifBlank { null })
            .placeholder(R.drawable.ic_placeholder)
            .error(R.drawable.ic_placeholder)
            .into(ivPoster)

        rvLinks.layoutManager = LinearLayoutManager(this)
        linkAdapter = MovierulzLinkAdapter(
            links = torrentLinks,
            onSeedrClick = { link ->
                val magnet = link.link ?: ""
                if (magnet.isNotBlank()) {
                    addToSeedr(magnet)
                } else {
                    Toast.makeText(this, "No valid torrent magnet found", Toast.LENGTH_SHORT).show()
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
        if (movieSlug.isBlank()) {
            Toast.makeText(this, "Invalid movie slug", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        val cacheKey = "movierulz_detail_$movieSlug"
        val cached = com.rsg.movies.providers.ContentCache.get<com.rsg.movies.data.model.MovierulzMovieDetailResponse>(cacheKey)
        if (cached != null) {
            bindDetailData(cached)
            return
        }

        pbLoading.visibility = View.VISIBLE
        nsvDetail.visibility = View.GONE

        lifecycleScope.launch {
            try {
                val resp = ApiClient.scrapersApi.getMovierulzMovie(movieSlug)
                pbLoading.visibility = View.GONE

                if (resp.isSuccessful && resp.body() != null) {
                    val body = resp.body()!!
                    com.rsg.movies.providers.ContentCache.put(cacheKey, body)
                    bindDetailData(body)
                } else {
                    nsvDetail.visibility = View.VISIBLE
                    Toast.makeText(this@MovierulzDetailActivity, "Could not load movie details", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                pbLoading.visibility = View.GONE
                nsvDetail.visibility = View.VISIBLE
                Toast.makeText(this@MovierulzDetailActivity, "Error: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun bindDetailData(body: com.rsg.movies.data.model.MovierulzMovieDetailResponse) {
        pbLoading.visibility = View.GONE
        nsvDetail.visibility = View.VISIBLE

        val details = body.details
        if (details != null) {
            tvTitle.text = details.name?.ifBlank { null } ?: movieName

            if (!details.quality.isNullOrBlank()) {
                tvQuality.text = details.quality
            }

            val img = details.image?.ifBlank { null } ?: movieImage
            if (!img.isNullOrBlank()) {
                Glide.with(this@MovierulzDetailActivity)
                    .load(img)
                    .placeholder(R.drawable.ic_placeholder)
                    .into(ivPoster)
            }

            val formattedMeta = details.getFormattedMeta()
            if (formattedMeta.isNotBlank()) {
                tvMeta.text = formattedMeta
                tvMeta.visibility = View.VISIBLE
            } else if (!details.desc.isNullOrBlank()) {
                tvMeta.text = details.desc
                tvMeta.visibility = View.VISIBLE
            } else {
                tvMeta.visibility = View.GONE
            }
        }

        val links = body.links ?: emptyList()
        torrentLinks.clear()
        torrentLinks.addAll(links)
        linkAdapter.notifyDataSetChanged()

        tvLinksHeader.text = "Available Torrents & Magnet Links (${torrentLinks.size})"
    }

    private fun addToSeedr(magnetLink: String) {
        val token = "Bearer ${ConfigManager.getAuthToken(this) ?: ""}"
        Toast.makeText(this, "Adding torrent to Seedr...", Toast.LENGTH_SHORT).show()

        lifecycleScope.launch {
            try {
                val body = mapOf("link" to magnetLink)
                val resp = ApiClient.filesApi.addTorrent(token, body, magnetLink)
                if (resp.isSuccessful) {
                    Toast.makeText(this@MovierulzDetailActivity, "Torrent added to Seedr! Downloading in cloud.", Toast.LENGTH_LONG).show()
                } else {
                    val errMsg = try {
                        val errStr = resp.errorBody()?.string() ?: ""
                        val json = org.json.JSONObject(errStr)
                        json.optJSONObject("error")?.optString("message") 
                            ?: json.optString("detail") 
                            ?: json.optString("message")
                    } catch (_: Exception) { null }
                    Toast.makeText(this@MovierulzDetailActivity, errMsg ?: "Failed to add torrent to Seedr", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@MovierulzDetailActivity, "Error adding to Seedr: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
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
}
