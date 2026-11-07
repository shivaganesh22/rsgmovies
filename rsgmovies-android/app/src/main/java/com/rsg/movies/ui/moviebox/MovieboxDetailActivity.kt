package com.rsg.movies.ui.moviebox

import android.app.Dialog
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.view.Window
import android.widget.Button
import android.widget.ImageView
import android.widget.LinearLayout
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
import com.rsg.movies.api.MovieboxApiService
import com.rsg.movies.data.api.ApiClient
import com.rsg.movies.data.model.*
import com.rsg.movies.ui.adapters.GenreChipAdapter
import com.rsg.movies.ui.adapters.MovieboxEpisodeAdapter
import com.rsg.movies.ui.adapters.MovieboxStreamAdapter
import com.rsg.movies.ui.player.PlayerActivity
import kotlinx.coroutines.launch

class MovieboxDetailActivity : FragmentActivity() {

    private var initialSubjectId: String = ""
    private var activeSubjectId: String = ""

    private var currentDetails: MovieboxDetailData? = null
    private var seasonsList = listOf<MovieboxSeasonItem>()
    private var selectedSeason: Int = 1
    private var selectedEpisode: Int = 1

    private var availableStreams = listOf<MovieboxStreamItem>()
    private var selectedStream: MovieboxStreamItem? = null
    private var currentCaptions = listOf<MovieboxCaptionItem>()

    private lateinit var nsvDetails: NestedScrollView
    private lateinit var pbLoading: ProgressBar
    private lateinit var ivBackdrop: ImageView
    private lateinit var ivPoster: ImageView
    private lateinit var tvBadgeType: TextView
    private lateinit var llRating: LinearLayout
    private lateinit var tvRating: TextView
    private lateinit var tvTitle: TextView
    private lateinit var tvYear: TextView
    private lateinit var tvGenre: TextView
    private lateinit var tvDuration: TextView
    private lateinit var tvOverview: TextView
    private lateinit var btnPlay: Button

    private lateinit var llDubsSection: LinearLayout
    private lateinit var rvDubs: RecyclerView

    private lateinit var llSeriesSection: LinearLayout
    private lateinit var rvSeasons: RecyclerView
    private lateinit var rvEpisodes: RecyclerView

    private lateinit var llStreamsSection: LinearLayout
    private lateinit var tvStreamsTitle: TextView
    private lateinit var rvStreams: RecyclerView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_moviebox_detail)

        initialSubjectId = intent.getStringExtra("SUBJECT_ID") ?: ""
        activeSubjectId = initialSubjectId

        initViews()
        fetchDetails()
    }

    private fun initViews() {
        nsvDetails = findViewById(R.id.nsv_moviebox_details)
        pbLoading = findViewById(R.id.pb_moviebox_detail_loading)
        ivBackdrop = findViewById(R.id.iv_moviebox_backdrop)
        ivPoster = findViewById(R.id.iv_moviebox_poster)
        tvBadgeType = findViewById(R.id.tv_moviebox_badge_type)
        llRating = findViewById(R.id.ll_moviebox_rating)
        tvRating = findViewById(R.id.tv_moviebox_rating)
        tvTitle = findViewById(R.id.tv_moviebox_title)
        tvYear = findViewById(R.id.tv_moviebox_year)
        tvGenre = findViewById(R.id.tv_moviebox_genre)
        tvDuration = findViewById(R.id.tv_moviebox_duration)
        tvOverview = findViewById(R.id.tv_moviebox_overview)
        btnPlay = findViewById(R.id.btn_moviebox_play)

        llDubsSection = findViewById(R.id.ll_moviebox_dubs_section)
        rvDubs = findViewById(R.id.rv_moviebox_dubs)

        llSeriesSection = findViewById(R.id.ll_moviebox_series_section)
        rvSeasons = findViewById(R.id.rv_moviebox_seasons)
        rvEpisodes = findViewById(R.id.rv_moviebox_episodes)

        llStreamsSection = findViewById(R.id.ll_moviebox_streams_section)
        tvStreamsTitle = findViewById(R.id.tv_moviebox_streams_title)
        rvStreams = findViewById(R.id.rv_moviebox_streams)

        rvDubs.layoutManager = LinearLayoutManager(this, LinearLayoutManager.HORIZONTAL, false)
        rvSeasons.layoutManager = LinearLayoutManager(this, LinearLayoutManager.HORIZONTAL, false)
        rvEpisodes.layoutManager = LinearLayoutManager(this, LinearLayoutManager.HORIZONTAL, false)
        rvStreams.layoutManager = LinearLayoutManager(this, LinearLayoutManager.HORIZONTAL, false)

        btnPlay.setOnClickListener {
            val stream = selectedStream ?: availableStreams.firstOrNull()
            if (stream != null) {
                showStreamActionModal(stream)
            } else {
                Toast.makeText(this, "Loading streams...", Toast.LENGTH_SHORT).show()
                fetchStreams()
            }
        }
    }

    private fun fetchDetails() {
        val cacheKey = "mb_detail_$initialSubjectId"
        val cached = com.rsg.movies.providers.ContentCache.get<MovieboxDetailData>(cacheKey)
        if (cached != null) {
            currentDetails = cached
            bindDetails(cached)
            handleDubsAndContent(cached)
            return
        }

        pbLoading.visibility = View.VISIBLE
        nsvDetails.visibility = View.GONE

        lifecycleScope.launch {
            try {
                val resp = ApiClient.movieboxApi.getDetails(initialSubjectId)
                if (resp.isSuccessful && resp.body() != null) {
                    currentDetails = resp.body()
                    com.rsg.movies.providers.ContentCache.put(cacheKey, currentDetails)
                    bindDetails(currentDetails!!)
                    handleDubsAndContent(currentDetails!!)
                } else {
                    pbLoading.visibility = View.GONE
                    Toast.makeText(this@MovieboxDetailActivity, "Could not load Moviebox details", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                pbLoading.visibility = View.GONE
                Toast.makeText(this@MovieboxDetailActivity, "Error: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun bindDetails(data: MovieboxDetailData) {
        pbLoading.visibility = View.GONE
        nsvDetails.visibility = View.VISIBLE

        tvTitle.text = data.getCleanTitle()
        tvBadgeType.text = if (data.isSeries()) "SERIES" else "MOVIE"

        val rating = data.getRating()
        if (rating > 0.0) {
            llRating.visibility = View.VISIBLE
            tvRating.text = String.format("%.1f", rating)
        } else {
            llRating.visibility = View.GONE
        }

        val year = data.getDisplayYear()
        tvYear.text = year
        tvYear.visibility = if (year.isNotBlank()) View.VISIBLE else View.GONE

        tvGenre.text = data.genre ?: if (data.isSeries()) "Series" else "Movie"

        if (!data.duration.isNullOrBlank()) {
            tvDuration.text = data.duration
            tvDuration.visibility = View.VISIBLE
        } else {
            tvDuration.visibility = View.GONE
        }

        tvOverview.text = data.description ?: ""
        tvOverview.visibility = if (!data.description.isNullOrBlank()) View.VISIBLE else View.GONE

        val coverUrl = data.getCoverUrl()
        Glide.with(this)
            .load(coverUrl.ifEmpty { null })
            .placeholder(R.drawable.ic_placeholder)
            .error(R.drawable.ic_placeholder)
            .into(ivPoster)

        Glide.with(this)
            .load(coverUrl.ifEmpty { null })
            .placeholder(R.drawable.ic_placeholder)
            .error(R.drawable.ic_placeholder)
            .into(ivBackdrop)

        btnPlay.requestFocus()
    }

    private fun handleDubsAndContent(data: MovieboxDetailData) {
        val dubs = data.dubs ?: emptyList()
        if (dubs.isNotEmpty()) {
            llDubsSection.visibility = View.VISIBLE

            // Prioritize Telugu dub if available
            val teluguDubIndex = dubs.indexOfFirst { it.isTelugu() }
            val defaultIndex = if (teluguDubIndex != null && teluguDubIndex >= 0) teluguDubIndex else 0
            val defaultDub = dubs[defaultIndex]
            activeSubjectId = defaultDub.getSubjectIdStr().ifBlank { initialSubjectId }

            val dubGenres = dubs.mapIndexed { idx, d ->
                Genre(rawId = d.getSubjectIdStr().ifBlank { idx.toString() }, name = d.getLabel())
            }

            val dubAdapter = GenreChipAdapter(dubGenres, defaultIndex) { selectedGenre, _ ->
                activeSubjectId = selectedGenre.id
                fetchStreams()
            }
            rvDubs.adapter = dubAdapter
        } else {
            llDubsSection.visibility = View.GONE
            activeSubjectId = initialSubjectId
        }

        if (data.isSeries()) {
            llSeriesSection.visibility = View.VISIBLE
            fetchEpisodes()
        } else {
            llSeriesSection.visibility = View.GONE
            fetchStreams()
        }
    }

    private fun fetchEpisodes() {
        lifecycleScope.launch {
            try {
                val resp = ApiClient.movieboxApi.getEpisodes(initialSubjectId)
                if (resp.isSuccessful && !resp.body().isNullOrEmpty()) {
                    seasonsList = resp.body()!!
                    setupSeasonsAndEpisodes()
                } else {
                    fetchStreams()
                }
            } catch (_: Exception) {
                fetchStreams()
            }
        }
    }

    private fun setupSeasonsAndEpisodes() {
        if (seasonsList.isEmpty()) {
            fetchStreams()
            return
        }

        val seasonGenres = seasonsList.mapIndexed { idx, s ->
            val sNum = s.season ?: (idx + 1)
            Genre(rawId = sNum.toString(), name = "Season $sNum")
        }

        selectedSeason = seasonsList[0].season ?: 1
        selectedEpisode = 1

        val seasonsAdapter = GenreChipAdapter(seasonGenres, 0) { seasonGenre, _ ->
            selectedSeason = seasonGenre.id.toIntOrNull() ?: 1
            selectedEpisode = 1
            bindEpisodesForSelectedSeason()
            fetchStreams()
        }
        rvSeasons.adapter = seasonsAdapter

        bindEpisodesForSelectedSeason()
        fetchStreams()
    }

    private fun bindEpisodesForSelectedSeason() {
        val matchedSeason = seasonsList.find { (it.season ?: 1) == selectedSeason } ?: seasonsList.firstOrNull()
        val count = matchedSeason?.episode_count ?: matchedSeason?.episodes?.size ?: 1
        val fallbackPoster = currentDetails?.getCoverUrl() ?: ""
        val eps = if (!matchedSeason?.episodes.isNullOrEmpty()) {
            matchedSeason!!.episodes!!
        } else {
            (1..count).map { epNum ->
                MovieboxEpisodeItem(
                    episode = epNum,
                    title = "Episode $epNum",
                    cover = fallbackPoster
                )
            }
        }
        val epAdapter = MovieboxEpisodeAdapter(
            episodes = eps,
            seasonNumber = selectedSeason,
            fallbackImage = fallbackPoster,
            selectedEpisodeNum = selectedEpisode
        ) { epItem ->
            selectedEpisode = epItem.episode ?: 1
            fetchStreams()
        }
        rvEpisodes.adapter = epAdapter
    }

    private fun fetchStreams() {
        val s = if (currentDetails?.isSeries() == true) selectedSeason else 0
        val e = if (currentDetails?.isSeries() == true) selectedEpisode else 0

        val cacheKey = "mb_streams_${activeSubjectId}_${s}_${e}"
        val cached = com.rsg.movies.providers.ContentCache.get<List<MovieboxStreamItem>>(cacheKey)
        if (!cached.isNullOrEmpty()) {
            availableStreams = cached
            val mp4Streams = availableStreams.filter { it.isMp4() }
            val pref = if (mp4Streams.isNotEmpty()) {
                mp4Streams.maxByOrNull { it.getNumericQuality() } ?: mp4Streams.first()
            } else {
                availableStreams.maxByOrNull { it.getNumericQuality() } ?: availableStreams.first()
            }
            selectedStream = pref
            val prefIdx = availableStreams.indexOf(pref).coerceAtLeast(0)

            tvStreamsTitle.text = "Available Video Streams (${availableStreams.size})"
            val streamAdapter = MovieboxStreamAdapter(availableStreams, prefIdx) { st, _ ->
                selectedStream = st
                showStreamActionModal(st)
            }
            rvStreams.adapter = streamAdapter
            val streamIdLong = (pref.id as? Number)?.toLong() ?: 0L
            fetchCaptions(streamIdLong)
            return
        }

        tvStreamsTitle.text = "Loading video streams..."

        lifecycleScope.launch {
            try {
                val resp = ApiClient.movieboxApi.getStreams(activeSubjectId, s, e)
                if (resp.isSuccessful && !resp.body()?.streams.isNullOrEmpty()) {
                    availableStreams = resp.body()!!.streams!!
                    com.rsg.movies.providers.ContentCache.put(cacheKey, availableStreams)
                    // Preferred: MP4 with highest resolution
                    // Fallback: highest resolution DASH stream
                    val mp4Streams = availableStreams.filter { it.isMp4() }
                    val pref = if (mp4Streams.isNotEmpty()) {
                        mp4Streams.maxByOrNull { it.getNumericQuality() } ?: mp4Streams.first()
                    } else {
                        availableStreams.maxByOrNull { it.getNumericQuality() } ?: availableStreams.first()
                    }
                    selectedStream = pref
                    val prefIdx = availableStreams.indexOf(pref).coerceAtLeast(0)

                    tvStreamsTitle.text = "Available Video Streams (${availableStreams.size})"
                    val streamAdapter = MovieboxStreamAdapter(availableStreams, prefIdx) { st, _ ->
                        selectedStream = st
                        showStreamActionModal(st)
                    }
                    rvStreams.adapter = streamAdapter

                    val streamIdLong = (pref.id as? Number)?.toLong() ?: 0L
                    fetchCaptions(streamIdLong)
                } else {
                    tvStreamsTitle.text = "No streams available for this dub/episode"
                }
            } catch (err: Exception) {
                tvStreamsTitle.text = "Failed to load streams"
            }
        }
    }

    private fun fetchCaptions(streamId: Long) {
        val s = if (currentDetails?.isSeries() == true) selectedSeason else 0
        val e = if (currentDetails?.isSeries() == true) selectedEpisode else 0

        lifecycleScope.launch {
            try {
                val resp = ApiClient.movieboxApi.getCaptions(activeSubjectId, s, e, streamId)
                if (resp.isSuccessful && !resp.body()?.captions.isNullOrEmpty()) {
                    currentCaptions = resp.body()!!.captions!!
                }
            } catch (_: Exception) {}
        }
    }

    private fun showStreamActionModal(stream: MovieboxStreamItem) {
        val rawUrl = stream.url ?: ""
        if (rawUrl.isBlank()) {
            Toast.makeText(this, "Stream URL is not available", Toast.LENGTH_SHORT).show()
            return
        }

        val proxiedUrl = MovieboxApiService.getProxiedStreamUrl(rawUrl, stream.headers)
        val title = currentDetails?.getCleanTitle() ?: "Moviebox Stream"
        val subtitleInfo = "${stream.getDisplayFormat()} ${stream.getQualityLabel()} • ${if (currentDetails?.isSeries() == true) "S${selectedSeason}E${selectedEpisode}" else "Full Movie"}"

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
        tvModalSubtitle.text = subtitleInfo

        // 1. VLC Player with Proxied URL (Default focused)
        btnVlc.setOnClickListener {
            dialog.dismiss()
            openExternalPlayer(proxiedUrl, "org.videolan.vlc")
        }

        // 2. MX Player with Proxied URL
        btnMx.setOnClickListener {
            dialog.dismiss()
            openExternalPlayer(proxiedUrl, "com.mxtech.videoplayer.ad")
        }

        // 3. Built-in App Player (ExoPlayer)
        btnPlayApp.setOnClickListener {
            dialog.dismiss()
            val intent = Intent(this, PlayerActivity::class.java).apply {
                putExtra("VIDEO_URL", proxiedUrl)
                putExtra("STREAM_URL", proxiedUrl)
                putExtra("MEDIA_TITLE", title)
                if (currentCaptions.isNotEmpty() && !currentCaptions[0].url.isNullOrBlank()) {
                    putExtra("SUBTITLE_URL", currentCaptions[0].url)
                    putExtra("SUBTITLE_LANG", currentCaptions[0].language ?: "en")
                }
            }
            startActivity(intent)
        }

        // 4. Copy Stream URL
        btnCopy.setOnClickListener {
            val clip = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            clip.setPrimaryClip(ClipData.newPlainText("Proxied Stream URL", proxiedUrl))
            Toast.makeText(this, "Proxied stream link copied to clipboard", Toast.LENGTH_SHORT).show()
            dialog.dismiss()
        }

        // 5. Download
        btnDownload?.setOnClickListener {
            dialog.dismiss()
            try {
                val downloadUrl = MovieboxApiService.getProxiedDownloadUrl(rawUrl, stream.headers, filename = "$title.mp4")
                val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(downloadUrl)).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                startActivity(browserIntent)
            } catch (_: Exception) {
                Toast.makeText(this, "Could not open browser for download", Toast.LENGTH_SHORT).show()
            }
        }

        btnCancel.setOnClickListener { dialog.dismiss() }

        btnVlc.requestFocus()
        dialog.show()
        btnVlc.post { btnVlc.requestFocus() }
    }

    private fun openExternalPlayer(streamUrl: String, packageName: String) {
        val uri = Uri.parse(streamUrl)
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "video/*")
            setPackage(packageName)
            putExtra("title", currentDetails?.getCleanTitle() ?: "Moviebox Stream")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        try {
            startActivity(intent)
        } catch (_: Exception) {
            val genericIntent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "video/*")
                putExtra("title", currentDetails?.getCleanTitle() ?: "Moviebox Stream")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            try {
                startActivity(Intent.createChooser(genericIntent, "Play with"))
            } catch (_: Exception) {
                Toast.makeText(this, "No external video player found", Toast.LENGTH_SHORT).show()
            }
        }
    }
}
