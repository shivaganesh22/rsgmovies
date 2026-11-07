package com.rsg.movies.data.model

import com.google.gson.JsonElement
import com.google.gson.annotations.SerializedName
import java.io.Serializable

// ======================== MOVIERULZ MODELS ========================

data class MovierulzResponse(
    val movies: List<MovierulzMovieItem>? = null
) : Serializable

data class MovierulzMovieItem(
    val name: String? = null,
    @SerializedName("clean_name") val clean_name: String? = null,
    val link: String? = null,
    val image: String? = null,
    val quality: String? = null,
    val language: String? = null,
    val year: String? = null
) : Serializable {

    fun getCleanSlug(): String {
        val l = link ?: ""
        return l.trimStart('/').replace(Regex("""\.html$"""), "").trim()
    }

    fun getDisplayTitle(): String {
        return clean_name?.trim()?.ifEmpty { null } ?: name?.trim() ?: "Movierulz Movie"
    }

    fun isCamOrDvdScr(): Boolean {
        val q = (quality ?: "").uppercase()
        return q.contains("CAM") || q.contains("PREDVD") || q.contains("DVDSCR") || q.contains("HDTS")
    }

    fun isHighQuality(): Boolean {
        val q = (quality ?: "").uppercase()
        return q.contains("HDRIP") || q.contains("WEB-DL") || q.contains("BLURAY") || q.contains("BRRIP")
    }
}

data class MovierulzMovieDetailResponse(
    val links: List<MovierulzTorrentLink>? = null,
    val streams: List<JsonElement>? = null,
    val details: MovierulzDetailObj? = null
) : Serializable

data class MovierulzTorrentLink(
    val name: String? = null,
    val link: String? = null,
    val quality: String? = null,
    val size: String? = null
) : Serializable {

    fun getResolutionBadge(): String {
        val q = quality ?: ""
        if (q.isNotBlank()) return q
        val n = (name ?: "").uppercase()
        return when {
            n.contains("1080P") -> "1080p"
            n.contains("720P") -> "720p"
            n.contains("480P") -> "480p"
            n.contains("HDRIP") -> "HDRip"
            else -> "Torrent"
        }
    }
}

data class MovierulzDetailObj(
    val name: String? = null,
    val image: String? = null,
    val quality: String? = null,
    val meta: Map<String, JsonElement>? = null,
    val info: List<String>? = null,
    val desc: String? = null
) : Serializable {

    fun getFormattedMeta(): String {
        val m = meta ?: return ""
        val parts = mutableListOf<String>()
        for ((key, value) in m) {
            if (value.isJsonArray) {
                val names = mutableListOf<String>()
                for (item in value.asJsonArray) {
                    if (item.isJsonObject && item.asJsonObject.has("name")) {
                        names.add(item.asJsonObject.get("name").asString)
                    } else if (item.isJsonPrimitive) {
                        names.add(item.asString)
                    }
                }
                if (names.isNotEmpty()) {
                    parts.add("$key: ${names.joinToString(", ")}")
                }
            } else if (value.isJsonPrimitive) {
                parts.add("$key: ${value.asString}")
            }
        }
        return parts.joinToString("   •   ")
    }
}


// ======================== TAMILMV MODELS ========================

data class TamilmvFeedResponse(
    val items: List<TamilmvItem>? = null
) : Serializable

data class TamilmvItem(
    @SerializedName("topic_id") val topic_id: String? = null,
    val name: String? = null,
    val slug: String? = null,
    val link: String? = null,
    val languages: List<String>? = null,
    val language: String? = null,
    val quality: String? = null,
    val year: String? = null
) : Serializable {

    fun getDisplayLanguages(): List<String> {
        if (!languages.isNullOrEmpty()) return languages
        if (!language.isNullOrBlank()) return listOf(language)
        return listOf("Multi")
    }

    fun isCamOrPreDvd(): Boolean {
        val q = (quality ?: "").uppercase()
        return q.contains("CAM") || q.contains("PREDVD") || q.contains("DVDSCR") || q.contains("HDTS")
    }
}

data class TamilmvImageItem(
    val link: String? = null
) : Serializable

data class TamilmvMovieDetailResponse(
    val title: String? = null,
    val links: List<TamilmvDownloadLink>? = null,
    val images: List<TamilmvImageItem>? = null,
    val details: JsonElement? = null
) : Serializable

data class TamilmvDownloadLink(
    val name: String? = null,
    val link: String? = null,
    val resolution: String? = null,
    val size: String? = null,
    @SerializedName("direct_link") val direct_link: String? = null
) : Serializable {

    fun getResolutionTag(): String {
        val r = resolution ?: ""
        if (r.isNotBlank()) return r
        val n = (name ?: "").uppercase()
        return when {
            n.contains("1080P") -> "1080p"
            n.contains("720P") -> "720p"
            n.contains("480P") -> "480p"
            n.contains("4K") || n.contains("2160P") -> "4K"
            else -> "HD"
        }
    }
}
