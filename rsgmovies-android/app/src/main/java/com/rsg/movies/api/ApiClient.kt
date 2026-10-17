package com.rsg.movies.data.api

import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.widget.Toast
import com.rsg.movies.api.ApiService
import com.rsg.movies.api.FolderService
import com.rsg.movies.api.OttApiService
import com.rsg.movies.api.TVAuthApi
import com.rsg.movies.data.ConfigManager
import com.rsg.movies.ui.auth.QRLoginActivity
import com.rsg.movies.ui.system.MaintenanceActivity
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

object ApiClient {
    const val BASE_URL = "https://rsg-movies.vercel.app/"
    const val FALLBACK_URL = "https://rsgmovies.vercel.app/"

    private var appContext: Context? = null
    private val isHandlingRevoke = AtomicBoolean(false)
    private val isHandlingMaintenance = AtomicBoolean(false)
    private val mainHandler = Handler(Looper.getMainLooper())

    fun init(context: Context) {
        appContext = context.applicationContext
    }

    private val authInterceptor = Interceptor { chain ->
        val original = chain.request()
        val builder = original.newBuilder()
            .header("X-Client", "TV")
            .header("X-Platform", "AndroidTV")

        val token = appContext?.let { ConfigManager.getAuthToken(it) }
        if (!token.isNullOrBlank() && !original.url.encodedPath.contains("/api/tv/auth/")) {
            builder.header("Authorization", "Bearer $token")
            builder.header("X-TV-Session-Token", token)
        }

        chain.proceed(builder.build())
    }

    private val errorAndFallbackInterceptor = Interceptor { chain ->
        val request = chain.request()
        var response: okhttp3.Response
        try {
            response = chain.proceed(request)
        } catch (e: Exception) {
            // Automatic fallback retry if connection failed on primary domain
            val originalHost = request.url.host
            if (originalHost.contains("rsg-movies.vercel.app")) {
                val fallbackUrl = request.url.newBuilder().host("rsgmovies.vercel.app").build()
                val fallbackRequest = request.newBuilder().url(fallbackUrl).build()
                response = chain.proceed(fallbackRequest)
            } else {
                throw e
            }
        }

        val code = response.code
        val isAuthEndpoint = request.url.encodedPath.contains("/api/tv/auth/")

        // 401 -> Session Revoked / Expired / Overridden by another device
        if (code == 401 && !isAuthEndpoint) {
            if (isHandlingRevoke.compareAndSet(false, true)) {
                mainHandler.post {
                    appContext?.let { ctx ->
                        ConfigManager.logout(ctx)
                        Toast.makeText(
                            ctx,
                            "Session ended: Your account was signed in on another device.",
                            Toast.LENGTH_LONG
                        ).show()
                        val intent = Intent(ctx, QRLoginActivity::class.java).apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                        }
                        ctx.startActivity(intent)
                    }
                    mainHandler.postDelayed({ isHandlingRevoke.set(false) }, 3000)
                }
            }
        }

        // 503 -> Server Maintenance Mode Active
        if (code == 503) {
            if (isHandlingMaintenance.compareAndSet(false, true)) {
                var maintMsg = "RSG Movies is currently undergoing scheduled maintenance. Please check back shortly."
                var maintTitle = "System Maintenance"
                try {
                    val peekBody = response.peekBody(2048).string()
                    val json = org.json.JSONObject(peekBody)
                    val err = json.optJSONObject("error")
                    if (err != null) {
                        maintMsg = err.optString("message", maintMsg)
                        val details = err.optJSONObject("details")
                        if (details != null) {
                            maintTitle = details.optString("title", maintTitle)
                        }
                    }
                } catch (_: Exception) {}

                val maintInfo = com.rsg.movies.data.model.MaintenanceInfo(
                    is_active = true,
                    title = maintTitle,
                    message = maintMsg
                )

                mainHandler.post {
                    appContext?.let { ctx ->
                        val intent = Intent(ctx, MaintenanceActivity::class.java).apply {
                            putExtra("MAINTENANCE_INFO", maintInfo)
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                        }
                        ctx.startActivity(intent)
                    }
                    mainHandler.postDelayed({ isHandlingMaintenance.set(false) }, 3000)
                }
            }
        }

        response
    }

    val okHttpClient: OkHttpClient by lazy {
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }
        val builder = OkHttpClient.Builder()
            .connectTimeout(20, TimeUnit.SECONDS)
            .readTimeout(25, TimeUnit.SECONDS)
            .writeTimeout(25, TimeUnit.SECONDS)
            .addInterceptor(authInterceptor)
            .addInterceptor(errorAndFallbackInterceptor)
            .addInterceptor(logging)

        appContext?.let { ctx ->
            try {
                val httpCacheDirectory = java.io.File(ctx.cacheDir, "http_response_cache")
                val cacheSize = 50L * 1024L * 1024L // 50 MiB
                builder.cache(okhttp3.Cache(httpCacheDirectory, cacheSize))
            } catch (_: Exception) {}
        }

        builder.build()
    }

    private val retrofit: Retrofit by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    val apiService: OttApiService by lazy {
        retrofit.create(OttApiService::class.java)
    }

    val tvAuthApi: TVAuthApi by lazy {
        retrofit.create(TVAuthApi::class.java)
    }

    val filesApi: ApiService by lazy {
        retrofit.create(ApiService::class.java)
    }

    val folderService: FolderService by lazy {
        retrofit.create(FolderService::class.java)
    }
}