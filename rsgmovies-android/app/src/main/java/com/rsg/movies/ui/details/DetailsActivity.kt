package com.rsg.movies.ui.details

import android.app.Dialog
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.net.Uri
import android.os.Bundle
import android.util.TypedValue
import android.view.View
import android.view.ViewGroup
import android.view.Window
import android.widget.Button
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.rsg.movies.R
import com.rsg.movies.data.model.DetailData
import com.rsg.movies.data.model.EpisodeItem
import com.rsg.movies.data.model.Genre
import com.rsg.movies.data.model.MediaItem
import com.rsg.movies.data.model.SeasonItem
import com.rsg.movies.data.model.VideoItem
import com.rsg.movies.providers.ContentProviderFactory
import com.rsg.movies.ui.adapters.GenreChipAdapter
import com.rsg.movies.ui.adapters.ModernCastAdapter
import com.rsg.movies.ui.adapters.ModernEpisodeAdapter
import com.rsg.movies.ui.adapters.ModernMediaCardAdapter
import com.rsg.movies.ui.adapters.StreamSelectorAdapter
import com.rsg.movies.ui.player.PlayerActivity
import kotlinx.coroutines.launch

class DetailsActivity : FragmentActivity() {

    private var mediaId: String = ""
    private var isSeries: Boolean = false

    private lateinit var ivBackdrop: ImageView
    private lateinit var ivPoster: ImageView
    private lateinit var tvBadgeQuality: TextView
    private lateinit var llRatingBadge: LinearLayout
    private lateinit var tvRating: TextView
    private lateinit var tvTitle: TextView
    private lateinit var tvTagline: TextView
    private lateinit var tvYear: TextView
    private lateinit var tvDuration: TextView
    private lateinit var tvViews: TextView
    private lateinit var llGenresContainer: LinearLayout
    private lateinit var tvLanguages: TextView
    private lateinit var tvOverview: TextView

    private lateinit var btnPlay: Button
    private lateinit var btnTrailer: Button

    private lateinit var llStreamsSection: LinearLayout
    private lateinit var rvStreams: RecyclerView

    private lateinit var llSeriesSection: LinearLayout
    private lateinit var tvEpisodesTitle: TextView
    private lateinit var rvSeasons: RecyclerView
    private lateinit var rvEpisodes: RecyclerView

    private lateinit var llCastSection: LinearLayout
    private lateinit var rvCast: RecyclerView

    private lateinit var llRelatedSection: LinearLayout
    private lateinit var tvRelatedTitle: TextView
    private lateinit var rvRelated: RecyclerView

    private lateinit var pbLoading: ProgressBar

    private lateinit var nsvDetails: androidx.core.widget.NestedScrollView

    private var currentDetail: DetailData? = null
    private var selectedVideo: VideoItem? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_details_modern)

        mediaId = intent.getStringExtra("MEDIA_ID") ?: ""
        val mediaType = intent.getStringExtra("MEDIA_TYPE") ?: ""
        isSeries = mediaType.equals("serie", true) || mediaType.equals("series", true)

        initViews()
        fetchDetails()
    }

    private fun initViews() {
        ivBackdrop = findViewById(R.id.iv_details_backdrop)
        ivPoster = findViewById(R.id.iv_details_poster)
        tvBadgeQuality = findViewById(R.id.tv_details_badge_quality)
        llRatingBadge = findViewById(R.id.ll_details_rating_badge)
        tvRating = findViewById(R.id.tv_details_rating)
        tvTitle = findViewById(R.id.tv_details_title)
        tvTagline = findViewById(R.id.tv_details_tagline)
        tvYear = findViewById(R.id.tv_details_year)
        tvDuration = findViewById(R.id.tv_details_runtime)
        tvViews = findViewById(R.id.tv_details_views)
        llGenresContainer = findViewById(R.id.ll_details_genres_container)
        tvLanguages = findViewById(R.id.tv_details_languages)
        tvOverview = findViewById(R.id.tv_details_overview)

        btnPlay = findViewById(R.id.btn_details_play)
        btnTrailer = findViewById(R.id.btn_details_trailer)

        llStreamsSection = findViewById(R.id.ll_streams_section)
        rvStreams = findViewById(R.id.rv_details_streams)

        llSeriesSection = findViewById(R.id.ll_series_section)
        tvEpisodesTitle = findViewById(R.id.tv_episodes_title)
        rvSeasons = findViewById(R.id.rv_details_seasons)
        rvEpisodes = findViewById(R.id.rv_details_episodes)

        llCastSection = findViewById(R.id.ll_cast_section)
        rvCast = findViewById(R.id.rv_details_cast)

        llRelatedSection = findViewById(R.id.ll_related_section)
        tvRelatedTitle = findViewById(R.id.tv_related_title)
        rvRelated = findViewById(R.id.rv_details_related)

        pbLoading = findViewById(R.id.pb_details_loading)
        nsvDetails = findViewById(R.id.nsv_details)

        com.rsg.movies.ui.TvFocusHelper.attachHorizontalRowFocus(rvStreams)
        com.rsg.movies.ui.TvFocusHelper.attachHorizontalRowFocus(rvSeasons)
        com.rsg.movies.ui.TvFocusHelper.attachHorizontalRowFocus(rvEpisodes)
        com.rsg.movies.ui.TvFocusHelper.attachHorizontalRowFocus(rvCast)
        com.rsg.movies.ui.TvFocusHelper.attachHorizontalRowFocus(rvRelated)
    }

    private fun fetchDetails() {
        pbLoading.visibility = View.VISIBLE

        lifecycleScope.launch {
            try {
                val provider = ContentProviderFactory.create()
                val detail = if (isSeries) provider.getSeriesDetails(mediaId) else provider.getMovieDetails(mediaId)
                
                pbLoading.visibility = View.GONE
                if (detail != null) {
                    var related: List<MediaItem>? = null
                    try {
                        related = if (isSeries) provider.getSeriesRelated(mediaId) else provider.getMovieRelated(mediaId)
                    } catch (_: Exception) {}

                    populateUI(detail, related)
                } else {
                    Toast.makeText(this@DetailsActivity, "Could not load title details", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                pbLoading.visibility = View.GONE
                Toast.makeText(this@DetailsActivity, "Error: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun formatRuntime(mins: Int?): String? {
        if (mins == null || mins <= 0) return null
        val h = mins / 60
        val m = mins % 60
        return if (h > 0) {
            if (m > 0) "${h}h ${m}m" else "${h}h"
        } else {
            "${m}m"
        }
    }

    private fun populateUI(detail: DetailData, related: List<MediaItem>?) {
        currentDetail = detail
        nsvDetails.visibility = View.VISIBLE

        val displayTitle = detail.title ?: detail.name ?: "Untitled"
        tvTitle.text = displayTitle

        val releaseDate = detail.release_date ?: detail.first_air_date ?: ""
        val year = if (releaseDate.length >= 4) releaseDate.substring(0, 4) else releaseDate
        if (year.isNotBlank()) {
            tvYear.text = year
            tvYear.visibility = View.VISIBLE
        } else {
            tvYear.visibility = View.GONE
        }

        if (isSeries) {
            val seasonsCount = detail.seasons?.size ?: 1
            tvDuration.text = "$seasonsCount Seasons"
            tvDuration.visibility = View.VISIBLE
        } else {
            val runtimeStr = formatRuntime(detail.runtime)
            if (runtimeStr != null) {
                tvDuration.text = runtimeStr
                tvDuration.visibility = View.VISIBLE
            } else {
                tvDuration.visibility = View.GONE
            }
        }

        val views = detail.views
        if (views != null && views > 0) {
            tvViews.text = "👁  $views views"
            tvViews.visibility = View.VISIBLE
        } else {
            tvViews.visibility = View.GONE
        }

        val quality = detail.quality ?: detail.badge ?: "HD"
        tvBadgeQuality.text = quality
        tvBadgeQuality.visibility = View.VISIBLE

        val rating = detail.vote_average ?: detail.rating
        if (rating != null && rating > 0.0) {
            llRatingBadge.visibility = View.VISIBLE
            tvRating.text = String.format("%.1f", rating)
        } else {
            llRatingBadge.visibility = View.GONE
        }

        val tagline = detail.tagline ?: detail.original_title ?: ""
        if (tagline.isNotBlank()) {
            tvTagline.text = tagline
            tvTagline.visibility = View.VISIBLE
        } else {
            tvTagline.visibility = View.GONE
        }

        llGenresContainer.removeAllViews()
        val genres = detail.genres ?: emptyList()
        if (genres.isNotEmpty()) {
            genres.take(5).forEach { g ->
                val gName = g.name
                if (gName.isNotBlank()) {
                    val chip = TextView(this).apply {
                        text = gName
                        setTextColor(resources.getColor(R.color.primary_light))
                        setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
                        setPadding(
                            (10 * resources.displayMetrics.density).toInt(),
                            (4 * resources.displayMetrics.density).toInt(),
                            (10 * resources.displayMetrics.density).toInt(),
                            (4 * resources.displayMetrics.density).toInt()
                        )
                        setBackgroundResource(R.drawable.badge_bg)
                        val lp = LinearLayout.LayoutParams(
                            ViewGroup.LayoutParams.WRAP_CONTENT,
                            ViewGroup.LayoutParams.WRAP_CONTENT
                        ).apply {
                            setMargins(0, 0, (6 * resources.displayMetrics.density).toInt(), 0)
                        }
                        layoutParams = lp
                    }
                    llGenresContainer.addView(chip)
                }
            }
        }

        val langStr = detail.getDisplayLanguages()
        if (langStr.isNotBlank()) {
            tvLanguages.text = "🌐  $langStr"
            tvLanguages.visibility = View.VISIBLE
        } else {
            tvLanguages.visibility = View.GONE
        }

        tvOverview.text = detail.overview ?: "No overview available for this title."

        val backdropUrl = detail.backdrop_path_tv ?: detail.backdrop_path ?: detail.poster_path ?: ""
        Glide.with(this)
            .load(backdropUrl)
            .placeholder(R.drawable.ic_placeholder)
            .error(R.drawable.ic_placeholder)
            .into(ivBackdrop)

        val posterUrl = detail.poster_path ?: detail.backdrop_path ?: ""
        Glide.with(this)
            .load(posterUrl)
            .placeholder(R.drawable.ic_placeholder)
            .error(R.drawable.ic_placeholder)
            .into(ivPoster)

        btnPlay.text = if (isSeries) "▶  Play S1 E1" else "▶  Watch Movie"

        btnPlay.setOnKeyListener { _, keyCode, event ->
            if (event.action == android.view.KeyEvent.ACTION_DOWN) {
                if (keyCode == android.view.KeyEvent.KEYCODE_DPAD_RIGHT) {
                    btnTrailer.requestFocus()
                    return@setOnKeyListener true
                } else if (keyCode == android.view.KeyEvent.KEYCODE_DPAD_LEFT) {
                    return@setOnKeyListener true
                }
            }
            false
        }

        btnTrailer.setOnKeyListener { _, keyCode, event ->
            if (event.action == android.view.KeyEvent.ACTION_DOWN) {
                if (keyCode == android.view.KeyEvent.KEYCODE_DPAD_LEFT) {
                    btnPlay.requestFocus()
                    return@setOnKeyListener true
                } else if (keyCode == android.view.KeyEvent.KEYCODE_DPAD_RIGHT) {
                    return@setOnKeyListener true
                }
            }
            false
        }

        btnPlay.post { btnPlay.requestFocus() }

        fun bindStreams(streamList: List<VideoItem>?) {
            if (!streamList.isNullOrEmpty()) {
                selectedVideo = streamList[0]
                llStreamsSection.visibility = View.VISIBLE
                rvStreams.adapter = StreamSelectorAdapter(streamList, -1) { vid, _ ->
                    selectedVideo = vid
                    showStreamActionModal(vid, displayTitle)
                }
            } else {
                llStreamsSection.visibility = View.GONE
            }
        }

        val videos = detail.videos ?: emptyList()
        if (!isSeries) {
            bindStreams(videos)
        }

        btnPlay.setOnClickListener {
            val vid = selectedVideo
                ?: (if (isSeries) detail.seasons?.firstOrNull()?.episodes?.firstOrNull()?.videos?.firstOrNull() else videos.firstOrNull())
            if (vid != null) {
                val title = if (isSeries) "$displayTitle - S1E1" else displayTitle
                showStreamActionModal(vid, title)
            } else {
                Toast.makeText(this, "No active stream available", Toast.LENGTH_SHORT).show()
            }
        }

        btnTrailer.setOnClickListener {
            val trailer = detail.trailer_url?.takeIf { it.isNotBlank() }
                ?: detail.preview_path?.takeIf { it.isNotBlank() }
                ?: "https://www.youtube.com/results?search_query=${Uri.encode("$displayTitle trailer")}"
            showTrailerActionModal(trailer, displayTitle)
        }

        val seasonsList: List<SeasonItem> = detail.seasons ?: emptyList()
        if (isSeries && seasonsList.isNotEmpty()) {
            llSeriesSection.visibility = View.VISIBLE
            val seasonChips = seasonsList.mapIndexed { idx, s ->
                Genre(idx.toString(), s.name ?: "Season ${s.season_number ?: (idx + 1)}")
            }

            val targetSeasonNo = intent.getIntExtra("SEASON_NO", -1)
            val targetEpisodeNo = intent.getIntExtra("EPISODE_NO", -1)
            val initialSeasonIndex = if (targetSeasonNo > 0) {
                seasonsList.indexOfFirst { (it.season_number ?: (seasonsList.indexOf(it) + 1)) == targetSeasonNo }.takeIf { it >= 0 } ?: 0
            } else 0

            fun bindSeasonEpisodes(seasonIndex: Int) {
                if (seasonIndex in seasonsList.indices) {
                    val s = seasonsList[seasonIndex]
                    val eps: List<EpisodeItem> = s.episodes ?: emptyList()
                    tvEpisodesTitle.text = "Episodes (${eps.size})"

                    val targetEp = if (targetEpisodeNo > 0) {
                        eps.firstOrNull { it.episode_number == targetEpisodeNo } ?: eps.firstOrNull()
                    } else eps.firstOrNull()

                    if (targetEp?.videos != null) {
                        bindStreams(targetEp.videos)
                    } else if (eps.isNotEmpty()) {
                        bindStreams(eps[0].videos)
                    }

                    val effectiveSeasonNo = s.season_number ?: (seasonIndex + 1)
                    val fallbackImg = detail.backdrop_path ?: detail.backdrop_path_tv ?: detail.poster_path ?: ""
                    rvEpisodes.adapter = ModernEpisodeAdapter(eps, effectiveSeasonNo, fallbackImg) { episode ->
                        val epVideo = episode.videos?.firstOrNull()
                        val epTitle = "${displayTitle} - S${effectiveSeasonNo}E${episode.episode_number ?: 1}"
                        bindStreams(episode.videos)
                        if (epVideo != null) {
                            showStreamActionModal(epVideo, epTitle)
                        } else {
                            Toast.makeText(this, "No stream available for this episode", Toast.LENGTH_SHORT).show()
                        }
                    }

                    if (targetEpisodeNo > 0) {
                        val epIdx = eps.indexOfFirst { it.episode_number == targetEpisodeNo }
                        if (epIdx > 0) {
                            rvEpisodes.scrollToPosition(epIdx)
                        }
                    }
                }
            }

            rvSeasons.adapter = GenreChipAdapter(seasonChips, initialSeasonIndex) { _, idx ->
                bindSeasonEpisodes(idx)
            }
            bindSeasonEpisodes(initialSeasonIndex)
        } else {
            llSeriesSection.visibility = View.GONE
        }

        // Cast & Crew (matching Screenshots 5 & 10)
        val casters = detail.casterslist ?: detail.cast
        if (!casters.isNullOrEmpty()) {
            llCastSection.visibility = View.VISIBLE
            rvCast.adapter = ModernCastAdapter(casters)
        } else {
            llCastSection.visibility = View.GONE
        }

        // Related Content (matching Screenshots 5 & 10)
        tvRelatedTitle.text = if (isSeries) "Related Series" else "Related Movies"
        val finalRelated = related ?: detail.relateds
        if (!finalRelated.isNullOrEmpty()) {
            llRelatedSection.visibility = View.VISIBLE
            rvRelated.adapter = ModernMediaCardAdapter(finalRelated)
        } else {
            llRelatedSection.visibility = View.GONE
        }

        // Default focus: Watch button or first stream
        btnPlay.requestFocus()
    }

    private fun showStreamActionModal(video: VideoItem, title: String) {
        val streamUrl = video.link ?: ""
        if (streamUrl.isBlank()) {
            Toast.makeText(this, "Stream URL is not available", Toast.LENGTH_SHORT).show()
            return
        }

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
        tvModalSubtitle.text = "${video.server ?: "Server 1"} (${video.lang ?: "Default"})"

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

    private fun showTrailerActionModal(rawUrl: String, title: String) {
        val trimmed = rawUrl.trim()
        if (trimmed.isBlank()) {
            Toast.makeText(this, "Trailer not available", Toast.LENGTH_SHORT).show()
            return
        }

        // Direct video files (.mp4 / .m3u8) can open directly
        if (trimmed.endsWith(".mp4", ignoreCase = true) ||
            trimmed.endsWith(".m3u8", ignoreCase = true) ||
            trimmed.contains(".mp4?", ignoreCase = true) ||
            trimmed.contains(".m3u8?", ignoreCase = true)) {
            openTrailerInApp(trimmed, title)
            return
        }

        val dialog = Dialog(this)
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE)
        dialog.setContentView(R.layout.dialog_trailer_action)
        dialog.window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))

        val tvModalTitle = dialog.findViewById<TextView>(R.id.tv_trailer_modal_title)
        val tvModalSubtitle = dialog.findViewById<TextView>(R.id.tv_trailer_modal_subtitle)
        val btnInApp = dialog.findViewById<Button>(R.id.btn_trailer_inapp)
        val btnSmartTube = dialog.findViewById<Button>(R.id.btn_trailer_smarttube)
        val btnYouTube = dialog.findViewById<Button>(R.id.btn_trailer_youtube)
        val btnBrowser = dialog.findViewById<Button>(R.id.btn_trailer_browser)
        val btnCancel = dialog.findViewById<Button>(R.id.btn_trailer_cancel)

        tvModalTitle.text = "$title — Trailer"
        tvModalSubtitle.text = "Select your preferred playback method"

        // 1. SmartTube (Top option)
        btnSmartTube.setOnClickListener {
            dialog.dismiss()
            openTrailerSmartTube(trimmed, title)
        }

        // 2. In-App WebView Player with D-pad controls
        btnInApp.setOnClickListener {
            dialog.dismiss()
            openTrailerInApp(trimmed, title)
        }

        // 3. YouTube App
        btnYouTube.setOnClickListener {
            dialog.dismiss()
            openTrailerYouTube(trimmed, title)
        }

        // 4. Web Browser
        btnBrowser.setOnClickListener {
            dialog.dismiss()
            openTrailerBrowser(trimmed, title)
        }

        // 5. Cancel
        btnCancel.setOnClickListener {
            dialog.dismiss()
        }

        btnSmartTube.requestFocus()
        dialog.show()
    }

    private fun extractYouTubeId(rawUrl: String): String {
        val trimmed = rawUrl.trim()
        return when {
            trimmed.contains("youtube.com/watch") -> {
                trimmed.substringAfter("v=", "").substringBefore("&").trim()
            }
            trimmed.contains("youtu.be/") -> {
                trimmed.substringAfterLast("youtu.be/").substringBefore("?").trim()
            }
            trimmed.contains("youtube.com/embed/") -> {
                trimmed.substringAfterLast("/embed/").substringBefore("?").trim()
            }
            !trimmed.startsWith("http") && trimmed.length in 8..15 && !trimmed.contains("/") -> {
                trimmed
            }
            trimmed.contains("v=") -> {
                trimmed.substringAfter("v=", "").substringBefore("&").trim()
            }
            else -> ""
        }
    }

    private fun getTrailerHttpUrl(rawUrl: String, title: String): String {
        val ytId = extractYouTubeId(rawUrl)
        return if (ytId.isNotBlank()) {
            "https://www.youtube.com/watch?v=$ytId"
        } else if (rawUrl.trim().startsWith("http")) {
            rawUrl.trim()
        } else {
            "https://www.youtube.com/results?search_query=${Uri.encode("$title trailer")}"
        }
    }

    // 1. In-App WebView Player
    private fun openTrailerInApp(rawUrl: String, title: String) {
        val trimmed = rawUrl.trim()
        if (trimmed.isBlank()) {
            Toast.makeText(this, "Trailer not available", Toast.LENGTH_SHORT).show()
            return
        }

        // Direct video URL (.mp4, .m3u8) -> launch PlayerActivity
        if (trimmed.endsWith(".mp4", ignoreCase = true) || 
            trimmed.endsWith(".m3u8", ignoreCase = true) || 
            trimmed.contains(".mp4?", ignoreCase = true) ||
            trimmed.contains(".m3u8?", ignoreCase = true)) {
            val intent = Intent(this, com.rsg.movies.ui.player.PlayerActivity::class.java).apply {
                putExtra("STREAM_URL", trimmed)
                putExtra("MEDIA_TITLE", "$title (Trailer)")
            }
            startActivity(intent)
            return
        }

        try {
            val intent = Intent(this, com.rsg.movies.ui.player.TrailerActivity::class.java).apply {
                putExtra("TRAILER_URL", trimmed)
                putExtra("MEDIA_TITLE", title)
            }
            startActivity(intent)
        } catch (e: Exception) {
            openTrailerBrowser(trimmed, title)
        }
    }

    // 2. SmartTube
    private fun openTrailerSmartTube(rawUrl: String, title: String) {
        val httpUrl = getTrailerHttpUrl(rawUrl, title)
        val httpUri = Uri.parse(httpUrl)
        val ytId = extractYouTubeId(rawUrl)
        val vndUri = if (ytId.isNotBlank()) Uri.parse("vnd.youtube:$ytId") else null

        val smartTubePackages = listOf(
            "org.smarttube.stable",
            "org.smarttube.beta",
            "com.liskovsoft.videomanager",
            "com.liskovsoft.smarttubetv.beta",
            "com.teamsmart.videomanager.tv"
        )

        for (pkg in smartTubePackages) {
            // A. Try standard ACTION_VIEW with httpUri & target package
            try {
                val intent = Intent(Intent.ACTION_VIEW, httpUri).apply {
                    setPackage(pkg)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                if (intent.resolveActivity(packageManager) != null) {
                    startActivity(intent)
                    return
                }
            } catch (_: Exception) {}

            // B. Try vnd.youtube scheme with target package
            if (vndUri != null) {
                try {
                    val intent = Intent(Intent.ACTION_VIEW, vndUri).apply {
                        setPackage(pkg)
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    if (intent.resolveActivity(packageManager) != null) {
                        startActivity(intent)
                        return
                    }
                } catch (_: Exception) {}
            }

            // C. Try launch intent for package with video URI
            try {
                val launchIntent = packageManager.getLaunchIntentForPackage(pkg)?.apply {
                    action = Intent.ACTION_VIEW
                    data = httpUri
                    putExtra("video_id", ytId)
                    putExtra("url", httpUrl)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                if (launchIntent != null) {
                    startActivity(launchIntent)
                    return
                }
            } catch (_: Exception) {}
        }

        Toast.makeText(this, "SmartTube not found. Opening in default player...", Toast.LENGTH_SHORT).show()
        openTrailerYouTube(rawUrl, title)
    }

    // 3. Official YouTube TV / App
    private fun openTrailerYouTube(rawUrl: String, title: String) {
        val httpUri = Uri.parse(getTrailerHttpUrl(rawUrl, title))
        val ytId = extractYouTubeId(rawUrl)
        val vndUri = if (ytId.isNotBlank()) Uri.parse("vnd.youtube:$ytId") else null

        val ytPackages = listOf(
            "com.google.android.youtube.tv",
            "com.google.android.youtube",
            "com.amazon.firetv.youtube"
        )

        for (pkg in ytPackages) {
            try {
                val intent = Intent(Intent.ACTION_VIEW, httpUri).apply {
                    setPackage(pkg)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                if (intent.resolveActivity(packageManager) != null) {
                    startActivity(intent)
                    return
                }
            } catch (_: Exception) {}
        }

        if (vndUri != null) {
            try {
                val intent = Intent(Intent.ACTION_VIEW, vndUri).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                if (intent.resolveActivity(packageManager) != null) {
                    startActivity(intent)
                    return
                }
            } catch (_: Exception) {}
        }

        openTrailerBrowser(rawUrl, title)
    }

    // 4. Web Browser
    private fun openTrailerBrowser(rawUrl: String, title: String) {
        val httpUri = Uri.parse(getTrailerHttpUrl(rawUrl, title))
        try {
            val intent = Intent(Intent.ACTION_VIEW, httpUri).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(intent)
        } catch (e: Exception) {
            try {
                val chooser = Intent.createChooser(Intent(Intent.ACTION_VIEW, httpUri), "Open Trailer With").apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                startActivity(chooser)
            } catch (e2: Exception) {
                Toast.makeText(this, "Could not open browser: ${e2.localizedMessage}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun openExternalPlayer(url: String, packageName: String) {
        try {
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(Uri.parse(url), "video/*")
                setPackage(packageName)
            }
            startActivity(intent)
        } catch (e: Exception) {
            val genericIntent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(Uri.parse(url), "video/*")
            }
            startActivity(Intent.createChooser(genericIntent, "Open with Video Player"))
        }
    }
}