package com.rsg.movies.ui.player

import android.os.Bundle
import android.view.WindowManager
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import com.google.android.exoplayer2.*
import com.google.android.exoplayer2.trackselection.DefaultTrackSelector
import com.google.android.exoplayer2.trackselection.MappingTrackSelector
import com.google.android.exoplayer2.ui.AspectRatioFrameLayout
import com.google.android.exoplayer2.ui.PlayerView
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.rsg.movies.R

class PlayerActivity : AppCompatActivity(), Player.Listener {

    private lateinit var exoPlayer: ExoPlayer
    private lateinit var playerView: PlayerView
    private lateinit var trackSelector: DefaultTrackSelector

    private val playbackSpeeds = arrayOf(0.25f, 0.5f, 0.75f, 1f, 1.25f, 1.5f, 1.75f, 2f)
    private val aspectRatios = arrayOf("Fit", "Zoom", "Fill", "Fixed Width", "Fixed Height")
    private val aspectRatioValues = arrayOf(
        AspectRatioFrameLayout.RESIZE_MODE_FIT,
        AspectRatioFrameLayout.RESIZE_MODE_ZOOM,
        AspectRatioFrameLayout.RESIZE_MODE_FILL,
        AspectRatioFrameLayout.RESIZE_MODE_FIXED_WIDTH,
        AspectRatioFrameLayout.RESIZE_MODE_FIXED_HEIGHT
    )
    private var currentAspectRatio = AspectRatioFrameLayout.RESIZE_MODE_FIT

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_folder_detail) // Using your existing layout

        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        initializePlayer()
        setupCustomControls()
        playerView.requestFocus()

        val videoUrl = intent.getStringExtra("VIDEO_URL")
        if (!videoUrl.isNullOrEmpty()) {
            playVideo(videoUrl)
        } else {
            Toast.makeText(this, "Failed to load video URL", Toast.LENGTH_SHORT).show()
            finish()
        }
    }

    override fun onBackPressed() {
        if (playerView.isControllerVisible) {
            playerView.hideController()
        } else {
            super.onBackPressed()
        }
    }

    private fun initializePlayer() {
        playerView = findViewById(R.id.player_view)
        trackSelector = DefaultTrackSelector(this).apply {
            setParameters(buildUponParameters().setPreferredTextLanguage("").setPreferredAudioLanguage("te"))
        }

        exoPlayer = ExoPlayer.Builder(this).setTrackSelector(trackSelector).build().apply {
            addListener(this@PlayerActivity)
            playWhenReady = true
            videoScalingMode = C.VIDEO_SCALING_MODE_SCALE_TO_FIT
        }

        playerView.player = exoPlayer
        playerView.setControllerAutoShow(true)
        playerView.controllerShowTimeoutMs = 5000

        val customControls = listOf(
            findViewById<ImageButton>(R.id.exo_playback_speed),
            findViewById<ImageButton>(R.id.exo_track_selection),
            findViewById<ImageButton>(R.id.exo_aspect_ratio),
            findViewById<ImageButton>(R.id.exo_volume_control)
        )

        playerView.setControllerVisibilityListener { visibility ->
            customControls.forEach { it?.visibility = visibility }
        }
    }

    private fun playVideo(videoUrl: String) {
        val mediaItem = MediaItem.fromUri(videoUrl)
        exoPlayer.setMediaItem(mediaItem)
        exoPlayer.prepare()
    }

    override fun onPlayerError(error: PlaybackException) {
        super.onPlayerError(error)
        Toast.makeText(this, "Playback error: ${error.message}", Toast.LENGTH_LONG).show()
    }

    private fun setupCustomControls() {
        findViewById<ImageButton>(R.id.exo_playback_speed)?.setOnClickListener { showPlaybackSpeedDialog() }
        findViewById<ImageButton>(R.id.exo_track_selection)?.setOnClickListener { showTrackSelectionDialog() }
        findViewById<ImageButton>(R.id.exo_aspect_ratio)?.setOnClickListener { showAspectRatioDialog() }
        findViewById<ImageButton>(R.id.exo_volume_control)?.setOnClickListener { showVolumeControlDialog() }
    }

    // --- DIALOG IMPLEMENTATIONS ---
    private fun showPlaybackSpeedDialog() {
        val currentSpeed = exoPlayer.playbackParameters.speed
        val currentSpeedIndex = playbackSpeeds.indexOfFirst { it == currentSpeed }.takeIf { it != -1 } ?: 3
        MaterialAlertDialogBuilder(this)
            .setTitle("Select Playback Speed")
            .setSingleChoiceItems(playbackSpeeds.map { "${it}x" }.toTypedArray(), currentSpeedIndex) { dialog, which ->
                exoPlayer.setPlaybackParameters(PlaybackParameters(playbackSpeeds[which]))
                dialog.dismiss()
            }
            .show()
    }

    private fun showAspectRatioDialog() {
        val currentAspectIndex = aspectRatioValues.indexOf(currentAspectRatio)
        MaterialAlertDialogBuilder(this)
            .setTitle("Select Aspect Ratio")
            .setSingleChoiceItems(aspectRatios, currentAspectIndex) { dialog, which ->
                currentAspectRatio = aspectRatioValues[which]
                playerView.resizeMode = currentAspectRatio
                dialog.dismiss()
            }
            .show()
    }

    private fun showVolumeControlDialog() {
        val dialogView = layoutInflater.inflate(R.layout.dialog_volume_control, null)
        val volumeSeekBar = dialogView.findViewById<SeekBar>(R.id.volume_seekbar)
        volumeSeekBar.max = 100
        volumeSeekBar.progress = (exoPlayer.volume * 100).toInt()
        MaterialAlertDialogBuilder(this)
            .setTitle("Volume Control")
            .setView(dialogView)
            .setPositiveButton("OK") { dialog, _ ->
                exoPlayer.volume = volumeSeekBar.progress / 100f
                dialog.dismiss()
            }
            .show()
    }

    private fun showTrackSelectionDialog() {
        val mappedTrackInfo = trackSelector.currentMappedTrackInfo ?: return
        val items = mutableListOf<String>()
        if (getRendererIndex(mappedTrackInfo, C.TRACK_TYPE_AUDIO) != -1) items.add("Audio")
        if (getRendererIndex(mappedTrackInfo, C.TRACK_TYPE_TEXT) != -1) items.add("Subtitles")

        if (items.isEmpty()) return
        MaterialAlertDialogBuilder(this).setTitle("Track Selection").setItems(items.toTypedArray()) { _, which ->
            when (items[which]) {
                "Audio" -> showAudioTrackSelectionDialog(mappedTrackInfo, getRendererIndex(mappedTrackInfo, C.TRACK_TYPE_AUDIO))
                "Subtitles" -> showSubtitleSelectionDialog(mappedTrackInfo, getRendererIndex(mappedTrackInfo, C.TRACK_TYPE_TEXT))
            }
        }.show()
    }

    private fun getRendererIndex(mappedTrackInfo: MappingTrackSelector.MappedTrackInfo, trackType: Int): Int {
        for (i in 0 until mappedTrackInfo.rendererCount) {
            if (mappedTrackInfo.getRendererType(i) == trackType) return i
        }
        return -1
    }

    private fun showAudioTrackSelectionDialog(mappedTrackInfo: MappingTrackSelector.MappedTrackInfo, rendererIndex: Int) {
        val trackGroups = mappedTrackInfo.getTrackGroups(rendererIndex)
        val tracks = mutableListOf<Pair<String, Pair<Int, Int>>>()
        for (g in 0 until trackGroups.length) {
            for (t in 0 until trackGroups[g].length) {
                tracks.add(buildTrackName(trackGroups[g].getFormat(t)) to (g to t))
            }
        }
        MaterialAlertDialogBuilder(this).setTitle("Select Audio").setItems(tracks.map { it.first }.toTypedArray()) { d, w ->
            val (g, t) = tracks[w].second
            val p = trackSelector.parameters.buildUpon().setSelectionOverride(rendererIndex, trackGroups, DefaultTrackSelector.SelectionOverride(g, t)).build()
            trackSelector.setParameters(p)
            d.dismiss()
        }.show()
    }

    private fun showSubtitleSelectionDialog(mappedTrackInfo: MappingTrackSelector.MappedTrackInfo, rendererIndex: Int) {
        val trackGroups = mappedTrackInfo.getTrackGroups(rendererIndex)
        val tracks = mutableListOf<Pair<String, Pair<Int, Int>>>("Off" to (-1 to -1))
        for (g in 0 until trackGroups.length) {
            for (t in 0 until trackGroups[g].length) {
                tracks.add(buildTrackName(trackGroups[g].getFormat(t)) to (g to t))
            }
        }
        MaterialAlertDialogBuilder(this).setTitle("Select Subtitles").setItems(tracks.map { it.first }.toTypedArray()) { d, w ->
            val p = trackSelector.parameters.buildUpon()
            if (w == 0) p.clearSelectionOverrides(rendererIndex).setRendererDisabled(rendererIndex, true)
            else {
                val (g, t) = tracks[w].second
                p.setRendererDisabled(rendererIndex, false).setSelectionOverride(rendererIndex, trackGroups, DefaultTrackSelector.SelectionOverride(g, t))
            }
            trackSelector.setParameters(p.build())
            d.dismiss()
        }.show()
    }

    private fun buildTrackName(format: Format): String = buildString {
        format.language?.let { append(it.uppercase()) }
        if (format.label != null) { if (length > 0) append(" - "); append(format.label) }
        if (length == 0) append("Track ${format.id ?: "Unknown"}")
    }

    override fun onDestroy() {
        super.onDestroy()
        window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        exoPlayer.release()
    }
    override fun onPause() { super.onPause(); exoPlayer.pause() }
    override fun onResume() { super.onResume(); exoPlayer.play() }
}