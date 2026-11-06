package com.rsg.movies.api

import android.util.Base64
import com.google.gson.Gson
import com.rsg.movies.data.model.*
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query
import java.net.URLEncoder

interface MovieboxApiService {

    @GET("react/moviebox/home/")
    suspend fun getHome(): Response<MovieboxHomeResponse>

    @GET("react/moviebox/search/")
    suspend fun search(
        @Query("query") query: String,
        @Query("page") page: Int = 1,
        @Query("per_page") perPage: Int = 20
    ): Response<MovieboxSearchResponse>

    @GET("react/moviebox/detail/{subject_id}/")
    suspend fun getDetails(@Path("subject_id") subjectId: String): Response<MovieboxDetailData>

    @GET("react/moviebox/episode/{subject_id}/")
    suspend fun getEpisodes(@Path("subject_id") subjectId: String): Response<List<MovieboxSeasonItem>>

    @GET("react/moviebox/streams/{subject_id}/{season}/{episode}/")
    suspend fun getStreams(
        @Path("subject_id") subjectId: String,
        @Path("season") season: Int = 0,
        @Path("episode") episode: Int = 0
    ): Response<MovieboxStreamsResponse>

    @GET("react/moviebox/captions/{subject_id}/{season}/{episode}/{stream_id}/")
    suspend fun getCaptions(
        @Path("subject_id") subjectId: String,
        @Path("season") season: Int = 0,
        @Path("episode") episode: Int = 0,
        @Path("stream_id") streamId: Long = 0
    ): Response<MovieboxCaptionsResponse>

    companion object {
        const val MOVIEBOX_BASE_URL = "https://rsgmovies-moviebox.vercel.app/"
        const val MOVIEBOX_PROXY_BASE = "http://129.225.115.187:5000"

        fun encodeHeaders(headers: Map<String, String>?): String {
            if (headers.isNullOrEmpty()) return ""
            return try {
                val json = Gson().toJson(headers)
                Base64.encodeToString(
                    json.toByteArray(Charsets.UTF_8),
                    Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING
                ).trim()
            } catch (_: Exception) {
                ""
            }
        }

        fun getProxiedStreamUrl(targetUrl: String, headers: Map<String, String>? = null): String {
            if (targetUrl.isBlank()) return ""
            val encodedTarget = try {
                URLEncoder.encode(targetUrl, "UTF-8")
            } catch (_: Exception) {
                targetUrl
            }
            val h = encodeHeaders(headers)
            return if (h.isNotBlank()) {
                "$MOVIEBOX_PROXY_BASE/stream?url=$encodedTarget&h=$h"
            } else {
                "$MOVIEBOX_PROXY_BASE/stream?url=$encodedTarget"
            }
        }

        fun getProxiedDownloadUrl(targetUrl: String, headers: Map<String, String>? = null, filename: String = ""): String {
            if (targetUrl.isBlank()) return ""
            val encodedTarget = try {
                URLEncoder.encode(targetUrl, "UTF-8")
            } catch (_: Exception) {
                targetUrl
            }
            val h = encodeHeaders(headers)
            val cleanName = if (filename.isNotBlank()) {
                try { URLEncoder.encode(filename, "UTF-8") } catch (_: Exception) { "" }
            } else ""
            val nameParam = if (cleanName.isNotBlank()) "&filename=$cleanName" else ""
            return if (h.isNotBlank()) {
                "$MOVIEBOX_PROXY_BASE/stream?url=$encodedTarget&download=1$nameParam&h=$h"
            } else {
                "$MOVIEBOX_PROXY_BASE/stream?url=$encodedTarget&download=1$nameParam"
            }
        }
    }
}
