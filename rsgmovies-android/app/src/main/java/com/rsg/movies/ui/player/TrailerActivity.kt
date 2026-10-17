package com.rsg.movies.ui.player

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.KeyEvent
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.rsg.movies.R

class TrailerActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var pbLoading: ProgressBar
    private lateinit var tvTitle: TextView
    private lateinit var tvActionFeedback: TextView
    private lateinit var tvHint: TextView

    private val mainHandler = Handler(Looper.getMainLooper())
    private var isPlayerReady = false
    private var isPlaying = true

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_trailer)

        val rawUrl = intent.getStringExtra("TRAILER_URL") ?: ""
        val title = intent.getStringExtra("MEDIA_TITLE") ?: "Official Trailer"

        webView = findViewById(R.id.wv_trailer)
        pbLoading = findViewById(R.id.pb_trailer_loading)
        tvTitle = findViewById(R.id.tv_trailer_title)
        tvActionFeedback = findViewById(R.id.tv_trailer_action_feedback)
        tvHint = findViewById(R.id.tv_trailer_hint)

        tvTitle.text = "$title — Trailer"
        mainHandler.postDelayed({ tvTitle.visibility = View.GONE }, 5000)
        mainHandler.postDelayed({ tvHint.visibility = View.GONE }, 6000)

        val trimmed = rawUrl.trim()
        if (trimmed.isBlank()) {
            Toast.makeText(this, "Trailer is not available", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        // 1. Direct video URL (.mp4 / .m3u8) -> redirect to ExoPlayer
        if (trimmed.endsWith(".mp4", ignoreCase = true) ||
            trimmed.endsWith(".m3u8", ignoreCase = true) ||
            trimmed.contains(".mp4?", ignoreCase = true) ||
            trimmed.contains(".m3u8?", ignoreCase = true)) {
            val intent = Intent(this, PlayerActivity::class.java).apply {
                putExtra("STREAM_URL", trimmed)
                putExtra("MEDIA_TITLE", "$title (Trailer)")
            }
            startActivity(intent)
            finish()
            return
        }

        // 2. Extract YouTube Video ID
        var ytId = ""
        when {
            trimmed.contains("youtube.com/watch") -> {
                ytId = trimmed.substringAfter("v=", "").substringBefore("&").trim()
            }
            trimmed.contains("youtu.be/") -> {
                ytId = trimmed.substringAfterLast("youtu.be/").substringBefore("?").trim()
            }
            trimmed.contains("youtube.com/embed/") -> {
                ytId = trimmed.substringAfterLast("/embed/").substringBefore("?").trim()
            }
            !trimmed.startsWith("http") && trimmed.length in 8..15 && !trimmed.contains("/") -> {
                ytId = trimmed
            }
            else -> {
                if (trimmed.contains("v=")) {
                    ytId = trimmed.substringAfter("v=", "").substringBefore("&").trim()
                } else if (!trimmed.startsWith("http")) {
                    ytId = trimmed
                }
            }
        }

        setupWebView(ytId, trimmed)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView(ytId: String, rawUrl: String) {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            useWideViewPort = true
            loadWithOverviewMode = true
            userAgentString = "Mozilla/5.0 (Linux; Android 10; BRAVIA 4K 2020) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36"
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                if (newProgress >= 70) {
                    pbLoading.visibility = View.GONE
                }
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                return false
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                pbLoading.visibility = View.GONE
                isPlayerReady = true
            }
        }

        val html = if (ytId.isNotBlank()) {
            """
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <style>
                    body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: #000; }
                    #player { width: 100%; height: 100%; border: none; }
                </style>
            </head>
            <body>
                <div id="player"></div>
                <script src="https://www.youtube.com/iframe_api"></script>
                <script>
                    var player;
                    var isPlaying = false;
                    function onYouTubeIframeAPIReady() {
                        player = new YT.Player('player', {
                            height: '100%',
                            width: '100%',
                            videoId: '$ytId',
                            playerVars: {
                                'autoplay': 1,
                                'controls': 1,
                                'rel': 0,
                                'modestbranding': 1,
                                'playsinline': 1,
                                'fs': 1,
                                'iv_load_policy': 3,
                                'enablejsapi': 1
                            },
                            events: {
                                'onReady': function(event) { event.target.playVideo(); isPlaying = true; },
                                'onStateChange': function(event) {
                                    isPlaying = (event.data == YT.PlayerState.PLAYING);
                                }
                            }
                        });
                    }
                    function togglePlayPause() {
                        if (!player) return;
                        var state = player.getPlayerState();
                        if (state == 1) {
                            player.pauseVideo();
                        } else {
                            player.playVideo();
                        }
                    }
                    function seek(seconds) {
                        if (!player) return;
                        var curr = player.getCurrentTime() || 0;
                        player.seekTo(Math.max(0, curr + seconds), true);
                    }
                    function playVideo() {
                        if (player) player.playVideo();
                    }
                    function pauseVideo() {
                        if (player) player.pauseVideo();
                    }
                </script>
            </body>
            </html>
            """.trimIndent()
        } else {
            val embedUrl = if (!rawUrl.startsWith("http")) "https://www.youtube-nocookie.com/embed/$rawUrl?autoplay=1&controls=1" else rawUrl
            """
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <style>
                    body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: #000; }
                    iframe { width: 100%; height: 100%; border: none; }
                </style>
            </head>
            <body>
                <iframe src="$embedUrl" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe>
            </body>
            </html>
            """.trimIndent()
        }

        webView.loadDataWithBaseURL("https://www.youtube-nocookie.com", html, "text/html", "UTF-8", null)
    }

    private fun showFeedback(text: String) {
        tvActionFeedback.text = text
        tvActionFeedback.visibility = View.VISIBLE
        mainHandler.removeCallbacks(hideFeedbackRunnable)
        mainHandler.postDelayed(hideFeedbackRunnable, 1500)
    }

    private val hideFeedbackRunnable = Runnable {
        tvActionFeedback.visibility = View.GONE
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        when (keyCode) {
            KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER, KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE -> {
                isPlaying = !isPlaying
                val statusText = if (isPlaying) "▶  Play" else "⏸  Pause"
                showFeedback(statusText)
                webView.evaluateJavascript("if (typeof togglePlayPause === 'function') { togglePlayPause(); }", null)
                return true
            }
            KeyEvent.KEYCODE_DPAD_LEFT, KeyEvent.KEYCODE_MEDIA_REWIND, KeyEvent.KEYCODE_MEDIA_PREVIOUS -> {
                showFeedback("⏪  -10s")
                webView.evaluateJavascript("if (typeof seek === 'function') { seek(-10); }", null)
                return true
            }
            KeyEvent.KEYCODE_DPAD_RIGHT, KeyEvent.KEYCODE_MEDIA_FAST_FORWARD, KeyEvent.KEYCODE_MEDIA_NEXT -> {
                showFeedback("⏩  +10s")
                webView.evaluateJavascript("if (typeof seek === 'function') { seek(10); }", null)
                return true
            }
            KeyEvent.KEYCODE_MEDIA_PLAY -> {
                isPlaying = true
                showFeedback("▶  Play")
                webView.evaluateJavascript("if (typeof playVideo === 'function') { playVideo(); }", null)
                return true
            }
            KeyEvent.KEYCODE_MEDIA_PAUSE -> {
                isPlaying = false
                showFeedback("⏸  Pause")
                webView.evaluateJavascript("if (typeof pauseVideo === 'function') { pauseVideo(); }", null)
                return true
            }
            KeyEvent.KEYCODE_DPAD_UP, KeyEvent.KEYCODE_DPAD_DOWN -> {
                tvHint.visibility = View.VISIBLE
                tvTitle.visibility = View.VISIBLE
                mainHandler.postDelayed({ tvHint.visibility = View.GONE }, 4000)
                mainHandler.postDelayed({ tvTitle.visibility = View.GONE }, 4000)
                return true
            }
            KeyEvent.KEYCODE_BACK -> {
                finish()
                return true
            }
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onDestroy() {
        mainHandler.removeCallbacksAndMessages(null)
        webView.stopLoading()
        webView.loadUrl("about:blank")
        webView.destroy()
        super.onDestroy()
    }
}

