package com.rsg.movies.data

import android.content.Context
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.rsg.movies.data.model.MediaItem

object FavoritesManager {
    private const val PREFS_NAME = "rsg_favorites_prefs"
    private const val FAVORITES_KEY = "saved_favorites"

    private fun getPrefs(context: Context) = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun getFavorites(context: Context): MutableList<MediaItem> {
        val json = getPrefs(context).getString(FAVORITES_KEY, null) ?: return mutableListOf()
        val type = object : TypeToken<MutableList<MediaItem>>() {}.type
        return Gson().fromJson(json, type)
    }

    fun isFavorite(context: Context, id: Long): Boolean {
        return getFavorites(context).any { it.id == id }
    }

    fun toggleFavorite(context: Context, item: MediaItem): Boolean {
        val favorites = getFavorites(context)
        val existing = favorites.find { it.id == item.id }

        val isNowFavorite = if (existing != null) {
            favorites.remove(existing)
            false
        } else {
            favorites.add(item)
            true
        }

        getPrefs(context).edit().putString(FAVORITES_KEY, Gson().toJson(favorites)).apply()
        return isNowFavorite
    }
}