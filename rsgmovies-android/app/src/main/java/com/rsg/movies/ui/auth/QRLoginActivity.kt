package com.rsg.movies.ui.auth

import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Color
import android.os.Bundle
import android.os.CountDownTimer
import android.view.View
import android.widget.Button
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.zxing.BarcodeFormat
import com.google.zxing.MultiFormatWriter
import com.rsg.movies.R
import com.rsg.movies.api.QRInitRequest
import com.rsg.movies.data.ConfigManager
import com.rsg.movies.data.api.ApiClient
import com.rsg.movies.ui.main.MainActivity
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class QRLoginActivity : AppCompatActivity() {

    private lateinit var ivQrCode: ImageView
    private lateinit var pbQrLoading: ProgressBar
    private lateinit var tvCountdown: TextView
    private lateinit var tvQrExpiry: TextView
    private lateinit var btnRetry: Button

    private var pollJob: Job? = null
    private var countdownTimer: CountDownTimer? = null
    private var currentRequestId: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_qr_login)

        ivQrCode = findViewById(R.id.iv_qr_code)
        pbQrLoading = findViewById(R.id.pb_qr_loading)
        tvCountdown = findViewById(R.id.tv_countdown)
        tvQrExpiry = findViewById(R.id.tv_qr_expiry)
        btnRetry = findViewById(R.id.btn_retry)

        btnRetry.setOnClickListener {
            btnRetry.visibility = View.GONE
            startQRFlow()
        }

        startQRFlow()
    }

    private fun startQRFlow() {
        cancelIntervals()
        pbQrLoading.visibility = View.VISIBLE
        ivQrCode.setImageBitmap(null)
        tvCountdown.text = "Generating QR Code..."

        val deviceId = ConfigManager.getDeviceId(this)

        lifecycleScope.launch {
            try {
                val response = ApiClient.tvAuthApi.initQR(
                    QRInitRequest(deviceId = deviceId, deviceName = "Android TV")
                )

                if (response.isSuccessful && response.body() != null) {
                    val data = response.body()!!
                    currentRequestId = data.requestId
                    val qrUrl = data.qrCodeUrl ?: "https://rsgmovies.vercel.app/tv-login?req=${data.requestId}"

                    val bitmap = generateQRCodeBitmap(qrUrl, 512, 512)
                    pbQrLoading.visibility = View.GONE

                    if (bitmap != null) {
                        ivQrCode.setImageBitmap(bitmap)
                        startCountdown(data.expiresInSeconds)
                        startPolling(data.requestId, deviceId)
                    } else {
                        tvCountdown.text = "Failed to render QR Code"
                        btnRetry.visibility = View.VISIBLE
                        btnRetry.requestFocus()
                    }
                } else {
                    pbQrLoading.visibility = View.GONE
                    tvCountdown.text = "Connection failed. Please retry."
                    btnRetry.visibility = View.VISIBLE
                    btnRetry.requestFocus()
                }
            } catch (e: Exception) {
                pbQrLoading.visibility = View.GONE
                tvCountdown.text = "Network Error: ${e.localizedMessage ?: "Check connection"}"
                btnRetry.visibility = View.VISIBLE
                btnRetry.requestFocus()
            }
        }
    }

    private fun startCountdown(seconds: Int) {
        countdownTimer?.cancel()
        countdownTimer = object : CountDownTimer(seconds * 1000L, 1000L) {
            override fun onTick(millisUntilFinished: Long) {
                val sec = millisUntilFinished / 1000
                val mins = sec / 60
                val remSec = sec % 60
                tvCountdown.text = String.format("Code expires in %d:%02d", mins, remSec)
            }

            override fun onFinish() {
                tvCountdown.text = "QR Code expired"
                cancelIntervals()
                btnRetry.visibility = View.VISIBLE
                btnRetry.requestFocus()
            }
        }.start()
    }

    private fun startPolling(requestId: String, deviceId: String) {
        pollJob?.cancel()
        pollJob = lifecycleScope.launch {
            while (isActive) {
                delay(2500)
                try {
                    val res = ApiClient.tvAuthApi.pollQR(
                        requestId = requestId,
                        deviceId = deviceId
                    )

                    if (res.isSuccessful && res.body() != null) {
                        val body = res.body()!!
                        when (body.status.uppercase()) {
                            "APPROVED" -> {
                                val token = body.sessionToken
                                if (!token.isNullOrBlank()) {
                                    ConfigManager.setAuthToken(this@QRLoginActivity, token)
                                    Toast.makeText(this@QRLoginActivity, "Login Approved! Welcome!", Toast.LENGTH_SHORT).show()
                                    cancelIntervals()
                                    startActivity(Intent(this@QRLoginActivity, MainActivity::class.java))
                                    finish()
                                    return@launch
                                }
                            }
                            "REJECTED" -> {
                                tvCountdown.text = "Login Rejected"
                                cancelIntervals()
                                btnRetry.visibility = View.VISIBLE
                                btnRetry.requestFocus()
                                return@launch
                            }
                            "EXPIRED" -> {
                                tvCountdown.text = "QR Code Expired"
                                cancelIntervals()
                                btnRetry.visibility = View.VISIBLE
                                btnRetry.requestFocus()
                                return@launch
                            }
                        }
                    }
                } catch (_: Exception) {
                    // Silent retry on transient drops
                }
            }
        }
    }

    private fun generateQRCodeBitmap(content: String, width: Int, height: Int): Bitmap? {
        return try {
            val bitMatrix = MultiFormatWriter().encode(content, BarcodeFormat.QR_CODE, width, height)
            val matrixWidth = bitMatrix.width
            val matrixHeight = bitMatrix.height
            val pixels = IntArray(matrixWidth * matrixHeight)
            for (y in 0 until matrixHeight) {
                val offset = y * matrixWidth
                for (x in 0 until matrixWidth) {
                    pixels[offset + x] = if (bitMatrix.get(x, y)) Color.BLACK else Color.WHITE
                }
            }
            val bitmap = Bitmap.createBitmap(matrixWidth, matrixHeight, Bitmap.Config.ARGB_8888)
            bitmap.setPixels(pixels, 0, matrixWidth, 0, 0, matrixWidth, matrixHeight)
            bitmap
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    private fun cancelIntervals() {
        pollJob?.cancel()
        pollJob = null
        countdownTimer?.cancel()
        countdownTimer = null
    }

    override fun onDestroy() {
        super.onDestroy()
        cancelIntervals()
    }
}
