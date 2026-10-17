package com.rsg.movies.ui.details

import android.app.Dialog
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.Drawable
import android.net.Uri
import android.os.Bundle
import android.util.Base64
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.leanback.app.DetailsSupportFragment
import androidx.leanback.app.DetailsSupportFragmentBackgroundController
import androidx.leanback.widget.*
import com.bumptech.glide.Glide
import com.bumptech.glide.request.target.CustomTarget
import com.bumptech.glide.request.transition.Transition
import com.rsg.movies.data.ConfigManager
import com.rsg.movies.data.FavoritesManager
import com.rsg.movies.data.api.ApiClient
import com.rsg.movies.data.model.*
import com.rsg.movies.ui.player.PlayerActivity
import com.rsg.movies.ui.presenters.*
import com.rsg.movies.ui.viewall.ViewAllActivity
import kotlinx.coroutines.*
import java.net.URL
import java.net.URLEncoder
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

class DetailsFragment : DetailsSupportFragment() {

    private lateinit var mAdapter: ArrayObjectAdapter
    private lateinit var mBackgroundController: DetailsSupportFragmentBackgroundController

    private var bgTarget: CustomTarget<Bitmap>? = null

    // NOTE: Make sure this dummy matches your updated DetailData constructor in the data model!
    private val overviewRow by lazy {
        DetailsOverviewRow(
            DetailData(
                id = -1L,
                title = "",
                name = "",
                poster_path = null,
                backdrop_path = null,
                backdrop_path_tv = null,
                overview = null,
                vote_average = null,
                subtitle = null,
                release_date = null,
                first_air_date = null,
                runtime = null,
                views = null,
                genres = null,
                genreslist = null,
                seasons = null,
                videos = null,
                casterslist = null
            )
        )
    }
    private var currentEpisodesAdapter: ArrayObjectAdapter? = null
    private var currentVideosList: List<VideoItem> = emptyList()

    private var mediaId = ""
    private var isSeries = false

    companion object {
        const val ACTION_FAVORITE = -2L
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        mBackgroundController = DetailsSupportFragmentBackgroundController(this)
        mBackgroundController.enableParallax()
        mBackgroundController.solidColor = Color.parseColor("#0F172A")

        mediaId = activity?.intent?.getStringExtra("MEDIA_ID") ?: ""
        isSeries = activity?.intent?.getStringExtra("MEDIA_TYPE")?.equals("serie", ignoreCase = true) == true

        setupUI()
        fetchData()
    }

    private fun setupUI() {
        val selector = ClassPresenterSelector()
        val detailsOverview = FullWidthDetailsOverviewRowPresenter(DetailsDescriptionPresenter())
        detailsOverview.backgroundColor = Color.parseColor("#0F172A")
        detailsOverview.actionsBackgroundColor = Color.parseColor("#1E293B")

        detailsOverview.onActionClickedListener = OnActionClickedListener { action ->
            if (action.id == ACTION_FAVORITE) {
                val detailData = overviewRow.item as? DetailData ?: return@OnActionClickedListener

                val mediaItemToSave = MediaItem(
                    id = detailData.id,
                    featuredId = null,
                    // FIX: Series use 'name', Movies use 'title'
                    title = detailData.title ?: detailData.name ?: "Unknown",
                    posterPath = detailData.poster_path,
                    backdropPath = detailData.backdrop_path,
                    backdropPathTv = detailData.backdrop_path_tv,
                    stillPath = null, overview = null, releaseDate = null, voteAverage = null,
                    type = if (isSeries) "serie" else "movie",
                    quality = null, subtitle = null, newEpisodes = null, genre = null, seasonNumber = null, episodeNumber = null, episodeName = null
                )

                val isNowFav = FavoritesManager.toggleFavorite(requireContext(), mediaItemToSave)

                action.label1 = if (isNowFav) "Remove from Favorites" else "Add to Favorites"
                val adapter = overviewRow.actionsAdapter as ArrayObjectAdapter
                val index = adapter.indexOf(action)
                if (index != -1) adapter.notifyArrayItemRangeChanged(index, 1)

                Toast.makeText(requireContext(), if (isNowFav) "Added to Favorites" else "Removed", Toast.LENGTH_SHORT).show()

            } else {
                val video = currentVideosList.find { it.id == action.id }
                if (video != null) {
                    showStreamOptionsDialog(video)
                }
            }
        }

        selector.addClassPresenter(DetailsOverviewRow::class.java, detailsOverview)
        selector.addClassPresenter(ListRow::class.java, ListRowPresenter())
        mAdapter = ArrayObjectAdapter(selector)
        adapter = mAdapter

        setOnItemViewClickedListener { _, item, _, _ ->
            when (item) {
                is SeasonItem -> {
                    currentEpisodesAdapter?.clear()
                    item.episodes?.let { currentEpisodesAdapter?.addAll(0, it) }
                    updateStreamsAsActions(item.episodes?.firstOrNull()?.videos)
                    Toast.makeText(requireContext(), "Showing: ${item.name}", Toast.LENGTH_SHORT).show()
                }
                is EpisodeItem -> {
                    updateStreamsAsActions(item.videos)
                    Toast.makeText(requireContext(), "Streams updated for: ${item.name}", Toast.LENGTH_SHORT).show()
                }
                is CastItem -> {
                    startActivity(Intent(requireContext(), ViewAllActivity::class.java).apply {
                        putExtra("ENDPOINT_PATH", "filmographie/detail/${item.id}")
                        putExtra("TITLE", "Movies with ${item.name}")
                        putExtra("MEDIA_TYPE", "movie")
                    })
                }
                is MediaItem -> {
                    val media = item as MediaItem
                    startActivity(Intent(requireContext(), DetailsActivity::class.java).apply {
                        putExtra("MEDIA_ID", media.id.toString())
                        putExtra("MEDIA_TYPE", media.type ?: "movie")
                    })
                }
            }
        }
    }

    private fun fetchData() {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val provider = com.rsg.movies.providers.ContentProviderFactory.create()
                val detail = if (isSeries) provider.getSeriesDetails(mediaId) else provider.getMovieDetails(mediaId)
                val related = if (isSeries) provider.getSeriesRelated(mediaId) else provider.getMovieRelated(mediaId)

                if (detail != null) {
                    withContext(Dispatchers.Main) {
                        populateUI(detail, related)
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) { Toast.makeText(requireContext(), "Failed to load details", Toast.LENGTH_SHORT).show() }
            }
        }
    }

    private fun populateUI(media: DetailData, related: List<MediaItem>?) {
        overviewRow.item = media

        mAdapter.add(overviewRow)

        if (isSeries && !media.seasons.isNullOrEmpty()) {
            val seasonsAdapter = ArrayObjectAdapter(SeasonPresenter())
            seasonsAdapter.addAll(0, media.seasons)
            mAdapter.add(ListRow(HeaderItem("Seasons"), seasonsAdapter))

            currentEpisodesAdapter = ArrayObjectAdapter(SeriesEpisodePresenter())
            media.seasons.firstOrNull()?.episodes?.let { currentEpisodesAdapter?.addAll(0, it) }
            mAdapter.add(ListRow(HeaderItem("Episodes"), currentEpisodesAdapter))

            updateStreamsAsActions(media.seasons.firstOrNull()?.episodes?.firstOrNull()?.videos)
        } else if (!media.videos.isNullOrEmpty()) {
            updateStreamsAsActions(media.videos)
        } else {
            updateStreamsAsActions(emptyList())
        }

        if (!media.casterslist.isNullOrEmpty()) {
            val castAdapter = ArrayObjectAdapter(CastCardPresenter())
            castAdapter.addAll(0, media.casterslist)
            mAdapter.add(ListRow(HeaderItem("Cast"), castAdapter))
        }

        if (!related.isNullOrEmpty()) {
            val relatedAdapter = ArrayObjectAdapter(MovieCardPresenter())
            relatedAdapter.addAll(0, related)
            mAdapter.add(ListRow(HeaderItem("Related Content"), relatedAdapter))
        }

        var imgUrl = media.poster_path ?: media.backdrop_path_tv
        if (imgUrl != null) imgUrl = imgUrl.replace("http://", "https://")

        Glide.with(this).asBitmap().load(imgUrl).into(object : CustomTarget<Bitmap>() {
            override fun onResourceReady(resource: Bitmap, transition: Transition<in Bitmap>?) {
                overviewRow.setImageBitmap(requireContext(), resource)
                mAdapter.notifyArrayItemRangeChanged(0, 1)
            }
            override fun onLoadCleared(placeholder: Drawable?) {}
        })

        val bgUrl = media.backdrop_path_tv ?: imgUrl
        if (bgUrl != null) {
            bgTarget = object : CustomTarget<Bitmap>() {
                override fun onResourceReady(resource: Bitmap, transition: Transition<in Bitmap>?) {
                    android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                        mBackgroundController.coverBitmap = resource
                    }, 150)
                }
                override fun onLoadCleared(placeholder: Drawable?) {}
            }
            Glide.with(requireContext().applicationContext)
                .asBitmap()
                .load(bgUrl.replace("http://", "https://"))
                .into(bgTarget!!)
        }
    }

    private fun updateStreamsAsActions(videos: List<VideoItem>?) {
        currentVideosList = videos ?: emptyList()
        val actionsAdapter = ArrayObjectAdapter()

        if (currentVideosList.isEmpty()) {
            actionsAdapter.add(Action(-1L, "No Streams Available"))
        } else {
            currentVideosList.forEach { video ->
                val label = "${video.server} ${if(video.lang != null) "(${video.lang})" else ""}"
                actionsAdapter.add(Action(video.id, label))
            }
        }

        val detailData = overviewRow.item as? DetailData
        if (detailData != null) {
            val isFav = FavoritesManager.isFavorite(requireContext(), detailData.id)
            val favText = if (isFav) "Remove from Favorites" else "Add to Favorites"
            actionsAdapter.add(Action(ACTION_FAVORITE, favText))
        }

        overviewRow.actionsAdapter = actionsAdapter

        val index = mAdapter.indexOf(overviewRow)
        if (index != -1) mAdapter.notifyArrayItemRangeChanged(index, 1)
    }

    private fun showStreamOptionsDialog(video: VideoItem) {
        val dialog = Dialog(requireContext())
        val layout = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.parseColor("#1E293B"))
            setPadding(48, 48, 48, 48)

            addView(TextView(requireContext()).apply {
                text = "Play: ${video.server}"
                setTextColor(Color.WHITE)
                textSize = 22f
                setTypeface(null, Typeface.BOLD)
                setPadding(16, 16, 16, 32)
            })

            val options = listOf("Play (Built-in Player)", "Play in VLC", "Play in MX Player", "Download", "Copy URL")
            options.forEachIndexed { index, opt ->
                addView(Button(requireContext()).apply {
                    text = opt
                    setTextColor(Color.WHITE)
                    setBackgroundColor(Color.TRANSPARENT)
                    gravity = Gravity.START or Gravity.CENTER_VERTICAL
                    setPadding(32, 24, 32, 24)
                    isFocusable = true
                    isFocusableInTouchMode = true
                    setOnFocusChangeListener { v, hasFocus ->
                        v.setBackgroundColor(if (hasFocus) Color.parseColor("#EF4444") else Color.TRANSPARENT)
                    }
                    setOnClickListener {
                        dialog.dismiss()
                        handleStreamAction(index, video)
                    }
                })
            }
        }
        dialog.setContentView(layout)
        dialog.show()
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

    private fun handleStreamAction(actionIndex: Int, video: VideoItem) {
        val finalUrl = generateSignedUrl(video.link)
        // FIX: Extract the title or name dynamically
        val detailData = overviewRow.item as? DetailData
        val mediaTitle = detailData?.title ?: detailData?.name ?: "Video Stream"

        when (actionIndex) {
            0 -> {
                val intent = Intent(requireContext(), PlayerActivity::class.java)
                intent.putExtra("VIDEO_URL", finalUrl)
                startActivity(intent)
            }
            1 -> {
                try {
                    val intent = Intent(Intent.ACTION_VIEW).apply {
                        setPackage("org.videolan.vlc")
                        setDataAndType(Uri.parse(finalUrl), "video/*")
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    startActivity(intent)
                } catch (e: Exception) {
                    openAppInStore(requireContext(), "org.videolan.vlc")
                }
            }
            2 -> {
                val intent = Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(Uri.parse(finalUrl), "video/*")
                    putExtra("title", mediaTitle)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }

                try {
                    intent.setPackage("com.mxtech.videoplayer.ad")
                    startActivity(intent)
                } catch (e: Exception) {
                    try {
                        intent.setPackage("com.mxtech.videoplayer.pro")
                        startActivity(intent)
                    } catch (e2: Exception) {
                        openAppInStore(requireContext(), "com.mxtech.videoplayer.ad")
                    }
                }
            }
            3 -> {
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(finalUrl)))
            }
            4 -> {
                val clipboard = requireContext().getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                val clip = ClipData.newPlainText("URL", finalUrl)
                clipboard.setPrimaryClip(clip)
                Toast.makeText(requireContext(), "URL Copied", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun generateSignedUrl(urlStr: String?): String {
        if (urlStr.isNullOrBlank()) return ""
        return try {
            val safeUrl = if (!urlStr.startsWith("http")) "https://$urlStr" else urlStr
            val urlObj = URL(safeUrl)
            val ts = System.currentTimeMillis() / 1000
            val mac = Mac.getInstance("HmacSHA256")
            mac.init(SecretKeySpec(ConfigManager.getDecryptKey().toByteArray(Charsets.UTF_8), "HmacSHA256"))
            val sig = Base64.encodeToString(mac.doFinal("${urlObj.path}$ts".toByteArray(Charsets.UTF_8)), Base64.NO_WRAP)
            "$safeUrl${if (urlObj.query == null) "?" else "&"}verify=$ts-${URLEncoder.encode(sig, "UTF-8")}"
        } catch (e: Exception) { urlStr }
    }
}