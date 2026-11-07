package com.rsg.movies.data

import android.content.Context
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

object LiveTvFavoritesManager {
    private const val PREFS_NAME = "rsg_livetv_prefs"
    private const val FAVORITES_KEY = "rsg_livetv_favorites"

    private fun getPrefs(context: Context) =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun getFavoriteIds(context: Context): Set<String> {
        val json = getPrefs(context).getString(FAVORITES_KEY, null) ?: return emptySet()
        return try {
            val type = object : TypeToken<Set<String>>() {}.type
            Gson().fromJson(json, type) ?: emptySet()
        } catch (_: Exception) {
            emptySet()
        }
    }

    fun isFavorite(context: Context, channelId: String?): Boolean {
        if (channelId.isNullOrBlank()) return false
        return getFavoriteIds(context).contains(channelId)
    }

    fun toggleFavorite(context: Context, channelId: String?): Boolean {
        if (channelId.isNullOrBlank()) return false
        val favs = getFavoriteIds(context).toMutableSet()
        val isNowFav = if (favs.contains(channelId)) {
            favs.remove(channelId)
            false
        } else {
            favs.add(channelId)
            true
        }
        getPrefs(context).edit().putString(FAVORITES_KEY, Gson().toJson(favs)).apply()
        return isNowFav
    }
}
