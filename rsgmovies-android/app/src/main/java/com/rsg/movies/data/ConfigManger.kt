package com.rsg.movies.data

import android.content.Context
import android.content.SharedPreferences
import android.provider.Settings
import java.util.UUID

object ConfigManager {
    var config: com.rsg.movies.data.model.AppConfigResponse? = null
    var tvConfig: com.rsg.movies.data.model.TVConfigResponse? = null
    var blastConfig: com.rsg.movies.data.model.BlastConfig? = null
    var dataMode: String = "BACKEND"

    private const val PREFS_NAME = "rsg_movies_prefs"
    private const val KEY_AUTH_TOKEN = "auth_token"
    private const val KEY_DEVICE_ID = "device_id"
    private const val KEY_DATA_MODE = "data_mode"

    const val PRIMARY_DOMAIN = "https://rsg-movies.vercel.app/"
    const val FALLBACK_DOMAIN = "https://rsgmovies.vercel.app/"

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun getAuthToken(context: Context): String? {
        return getPrefs(context).getString(KEY_AUTH_TOKEN, null)
    }

    fun setAuthToken(context: Context, token: String?) {
        getPrefs(context).edit().putString(KEY_AUTH_TOKEN, token).apply()
    }

    fun getDataMode(context: Context): String {
        return getPrefs(context).getString(KEY_DATA_MODE, dataMode) ?: dataMode
    }

    fun setDataMode(context: Context, mode: String) {
        dataMode = mode
        getPrefs(context).edit().putString(KEY_DATA_MODE, mode).apply()
    }

    fun isLoggedIn(context: Context): Boolean {
        val token = getAuthToken(context)
        return !token.isNullOrBlank()
    }

    fun logout(context: Context) {
        getPrefs(context).edit().remove(KEY_AUTH_TOKEN).apply()
        com.rsg.movies.providers.ContentCache.clear()
    }

    fun getDeviceId(context: Context): String {
        val prefs = getPrefs(context)
        var id = prefs.getString(KEY_DEVICE_ID, null)
        if (id.isNullOrBlank()) {
            try {
                id = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
            } catch (_: Exception) {}
            if (id.isNullOrBlank() || id == "9774d56d682e549c") {
                id = UUID.randomUUID().toString()
            }
            prefs.edit().putString(KEY_DEVICE_ID, id).apply()
        }
        return id
    }

    fun getDomain(): String {
        val dom = config?.domain ?: PRIMARY_DOMAIN
        return if (dom.endsWith("/")) dom else "$dom/"
    }
    fun getEndpointKey(): String = config?.endpoint ?: ""

    fun getHomeUrl(): String = "${getDomain()}api/media/mobile/${getEndpointKey()}"
    fun getCategoryUrl(path: String): String = "${getDomain()}api/$path/${getEndpointKey()}"
    fun getDecryptKey(): String = config?.decrypt ?: "GJ8reydarI7Jqat9rvbAJKNQ9gY4DoEQF2H5nfuI1gi"
    fun getMovieDetailsUrl(id: String): String = "${getDomain()}api/media/detail/$id/${getEndpointKey()}"
    fun getSeriesDetailsUrl(id: String): String = "${getDomain()}api/series/detail/$id/${getEndpointKey()}"
    fun getRelatedMediaUrl(id: String, isSeries: Boolean): String {
        val path = if (isSeries) "series/relateds" else "media/relateds"
        return "${getDomain()}api/$path/$id/${getEndpointKey()}"
    }
    fun getSearchUrl(query: String): String = "${getDomain()}api/search/$query/${getEndpointKey()}"
}