package com.rsg.movies.data.model

import com.google.gson.JsonElement
import com.google.gson.annotations.SerializedName
import java.io.Serializable

data class MovieboxHomeResponse(
    val code: Int? = 0,
    val message: String? = null,
    val data: MovieboxHomeData? = null
) : Serializable

data class MovieboxHomeData(
    @SerializedName("operatingList") val operatingList: List<MovieboxOperatingItem>? = null,
    @SerializedName("platformList") val platformList: List<JsonElement>? = null
) : Serializable

data class MovieboxOperatingItem(
    val position: Int? = null,
    val title: String? = null,
    val type: String? = null,
    val banner: MovieboxBannerWrapper? = null,
    val subjects: List<MovieboxSubjectItem>? = null
) : Serializable

data class MovieboxBannerWrapper(
    val items: List<MovieboxBannerItem>? = null
) : Serializable

data class MovieboxBannerItem(
    val title: String? = null,
    val image: MovieboxImage? = null,
    val subjectId: String? = null,
    val subject: MovieboxSubjectItem? = null
) : Serializable

data class MovieboxImage(
    val url: String? = null
) : Serializable

data class MovieboxSubjectItem(
    @SerializedName("subjectId", alternate = ["subject_id", "id"]) val subjectId: String? = null,
    val title: String? = null,
    val cover: JsonElement? = null,
    val image: JsonElement? = null,
    @SerializedName("imdbRatingValue", alternate = ["imdb_rating", "rating"]) val imdbRatingValue: String? = null,
    @SerializedName("releaseDate", alternate = ["release_date"]) val releaseDate: String? = null,
    @SerializedName("appointmentDate", alternate = ["appointment_date"]) val appointmentDate: String? = null,
    @SerializedName("subjectType", alternate = ["subject_type"]) val subjectType: Int? = null,
    @SerializedName("description", alternate = ["overview", "postTitle"]) val description: String? = null,
    val genre: String? = null
) : Serializable {

    fun getCoverUrl(): String {
        fun extractUrl(elem: JsonElement?): String? {
            if (elem == null || elem.isJsonNull) return null
            if (elem.isJsonPrimitive) return elem.asString
            if (elem.isJsonObject) {
                val obj = elem.asJsonObject
                if (obj.has("url") && !obj.get("url").isJsonNull) {
                    return obj.get("url").asString
                }
            }
            return null
        }

        return extractUrl(cover)
            ?: extractUrl(image)
            ?: ""
    }

    fun isSeries(): Boolean = subjectType == 2

    fun getCleanTitle(): String {
        val raw = title ?: "Untitled"
        return raw.replace(Regex("""\[.*?\]"""), "").trim().ifEmpty { raw }
    }

    fun getDisplayYear(): String {
        val date = releaseDate?.trim() ?: appointmentDate?.trim() ?: ""
        val match = Regex("""\b(19\d{2}|20\d{2})\b""").find(date)
        return match?.value ?: (if (date.length >= 4) date.substring(0, 4) else "")
    }

    fun getRating(): Double {
        return imdbRatingValue?.toDoubleOrNull() ?: 0.0
    }
}

data class MovieboxDetailData(
    @SerializedName("subject_id", alternate = ["subjectId", "id"]) val subject_id: String? = null,
    val title: String? = null,
    val cover: JsonElement? = null,
    val description: String? = null,
    @SerializedName("subject_type", alternate = ["subjectType"]) val subject_type: Int? = null,
    val type: String? = null,
    @SerializedName("imdb_rating", alternate = ["imdbRatingValue", "rating"]) val imdb_rating: String? = null,
    @SerializedName("release_date", alternate = ["releaseDate"]) val release_date: String? = null,
    val genre: String? = null,
    val duration: String? = null,
    val dubs: List<MovieboxDubItem>? = null
) : Serializable {

    fun isSeries(): Boolean {
        return subject_type == 2 || type.equals("Series", ignoreCase = true)
    }

    fun getCoverUrl(): String {
        if (cover == null || cover.isJsonNull) return ""
        if (cover.isJsonPrimitive) return cover.asString
        if (cover.isJsonObject) {
            val obj = cover.asJsonObject
            if (obj.has("url") && !obj.get("url").isJsonNull) {
                return obj.get("url").asString
            }
        }
        return ""
    }

    fun getCleanTitle(): String {
        val raw = title ?: "Untitled"
        return raw.replace(Regex("""\[.*?\]"""), "").trim().ifEmpty { raw }
    }

    fun getDisplayYear(): String {
        val date = release_date?.trim() ?: ""
        val match = Regex("""\b(19\d{2}|20\d{2})\b""").find(date)
        return match?.value ?: (if (date.length >= 4) date.substring(0, 4) else "")
    }

    fun getRating(): Double {
        return imdb_rating?.toDoubleOrNull() ?: 0.0
    }
}

data class MovieboxDubItem(
    @SerializedName("subject_id", alternate = ["subjectId", "id"]) val subject_id: JsonElement? = null,
    @SerializedName("lang_name", alternate = ["language", "name", "title"]) val lang_name: String? = null,
    val language: String? = null,
    val name: String? = null
) : Serializable {

    fun getSubjectIdStr(): String {
        if (subject_id == null || subject_id.isJsonNull) return ""
        return if (subject_id.isJsonPrimitive) subject_id.asString else subject_id.toString()
    }

    fun getLabel(): String {
        return lang_name?.trim() ?: language?.trim() ?: name?.trim() ?: "Dub"
    }

    fun isTelugu(): Boolean {
        val l = getLabel().lowercase()
        return l.contains("tel") || l.contains("telugu")
    }
}

data class MovieboxSeasonItem(
    val season: Int? = 1,
    val episodes: List<MovieboxEpisodeItem>? = null
) : Serializable

data class MovieboxEpisodeItem(
    val episode: Int? = 1,
    val title: String? = null,
    val cover: String? = null
) : Serializable

data class MovieboxStreamsResponse(
    val streams: List<MovieboxStreamItem>? = null
) : Serializable

data class MovieboxStreamItem(
    val id: Long? = null,
    val name: String? = null,
    @SerializedName("quality_value") val quality_value: Int? = null,
    val resolution: Int? = null,
    val url: String? = null,
    val headers: Map<String, String>? = null,
    val cookie: String? = null
) : Serializable {

    fun getQualityLabel(): String {
        if (!name.isNullOrBlank()) return name
        if (resolution != null && resolution > 0) return "${resolution}p"
        if (quality_value != null && quality_value > 0) return "${quality_value}p"
        return "HD"
    }
}

data class MovieboxCaptionsResponse(
    val captions: List<MovieboxCaptionItem>? = null
) : Serializable

data class MovieboxCaptionItem(
    val language: String? = null,
    val url: String? = null
) : Serializable

data class MovieboxSearchResponse(
    val code: Int? = 0,
    val data: MovieboxSearchData? = null
) : Serializable

data class MovieboxSearchData(
    val items: List<MovieboxSubjectItem>? = null
) : Serializable
