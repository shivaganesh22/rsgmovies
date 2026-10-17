package com.rsg.movies.data.model

import com.google.gson.annotations.SerializedName

data class AppConfigResponse(
    val domain: String,
    val endpoint: String,
    val token: String?,
    val decrypt: String?
)

data class HomeResponse(
    val featured: List<MediaItem>?,
    val pinned: List<MediaItem>?,
    val rvcontent: Map<String, List<MediaItem>>?,
    @SerializedName("latest_movies") val latestMovies: List<MediaItem>?,
    @SerializedName("latest_series_episodes", alternate = ["latest_episodes", "episodes"]) val latestEpisodes: List<MediaItem>?,
    val recommended: List<MediaItem>?,
    val trending: List<MediaItem>?,
    val choosed: List<MediaItem>?,
    @SerializedName("popular_series", alternate = ["popularSeries"]) val popularSeries: List<MediaItem>?,
    @SerializedName("recently_added", alternate = ["latest"]) val recentlyAdded: List<MediaItem>?,
    @SerializedName("latest_series", alternate = ["recents"]) val latestSeries: List<MediaItem>?,
    @SerializedName("next_this_week", alternate = ["thisweek"]) val thisWeek: List<MediaItem>?,
    @SerializedName("most_popular", alternate = ["popular"]) val mostPopular: List<MediaItem>?
)

data class MediaListResponse(
    @SerializedName("current_page", alternate = ["page"]) val current_page: Int? = 1,
    @SerializedName("last_page", alternate = ["total_pages", "total_page"]) val last_page: Int? = 1,
    @SerializedName("data", alternate = ["results", "items"]) val data: List<MediaItem>? = emptyList()
) : java.io.Serializable {
    fun hasMorePages(): Boolean = (current_page ?: 1) < (last_page ?: 1)
}

data class MediaItem(
    val id: Long,
    @SerializedName("featured_id") val featuredId: Long? = null,
    @SerializedName("series_id", alternate = ["serieTmdb", "seriesId", "series_tmdb", "serie_id", "serie_tmdb", "serie", "series", "media_id", "parent_id", "show_id"]) val seriesId: Long? = null,
    @SerializedName("title", alternate = ["name", "original_name", "title_name"]) val title: String? = null,
    @SerializedName("poster_path", alternate = ["poster", "image", "img", "thumbnail"]) val posterPath: String? = null,
    @SerializedName("backdrop_path", alternate = ["backdrop", "fanart"]) val backdropPath: String? = null,
    @SerializedName("backdrop_path_tv") val backdropPathTv: String? = null,
    @SerializedName("still_path", alternate = ["still_path_tv", "still"]) val stillPath: String? = null,
    val overview: String? = null,
    @SerializedName("release_date", alternate = ["first_air_date", "created_at", "release_year", "updated_at", "releaseDate", "firstAirDate", "date", "air_date"]) val releaseDate: String? = null,
    // Separate field for integer year fields from API (e.g. "year": 2023)
    @SerializedName("year") val rawYear: Any? = null,
    @SerializedName("vote_average", alternate = ["rating", "vote_count"]) val voteAverage: Double? = null,
    val type: String? = null,
    @SerializedName("quality", alternate = ["quality_name", "res", "resolution"]) val quality: String? = null,
    val subtitle: String? = null,
    @SerializedName("newEpisodes", alternate = ["new_episodes", "new", "is_new", "isNew"]) val newEpisodes: Any? = null,
    @SerializedName("genre", alternate = ["genre_name", "genresname"]) val genre: String? = null,
    @SerializedName("genreslist") val genreslist: List<String>? = null,
    @SerializedName("genres") val genres: List<Genre>? = null,
    @SerializedName("season_number", alternate = ["season_no"]) val seasonNumber: Int? = null,
    @SerializedName("episode_number", alternate = ["episode_no"]) val episodeNumber: Int? = null,
    @SerializedName("episode_name") val episodeName: String? = null
) : java.io.Serializable {

    fun isSeriesType(): Boolean {
        val t = type?.lowercase() ?: ""
        if (t == "series" || t == "serie" || t == "tv" || t == "anime") return true
        if (seasonNumber != null || episodeNumber != null || seriesId != null) return true
        if (newEpisodes != null) {
            val str = newEpisodes.toString().trim()
            // Safely handle boolean/numeric types from Gson (may be "true", "1", "2.0", etc.)
            if (str == "true") return true
            val d = str.toDoubleOrNull()
            if (d != null && d > 0.0) return true
        }
        return false
    }

    fun getDisplayGenre(): String {
        if (!genre.isNullOrBlank()) {
            return genre.split(",").firstOrNull()?.trim() ?: ""
        }
        if (!genreslist.isNullOrEmpty()) {
            return genreslist.firstOrNull()?.trim() ?: ""
        }
        if (!genres.isNullOrEmpty()) {
            return genres.firstOrNull()?.name?.trim() ?: ""
        }
        return if (isSeriesType()) "SERIES" else "MOVIE"
    }

    fun getDisplayYear(): String {
        // First try releaseDate (String field)
        if (!releaseDate.isNullOrBlank()) {
            val trimmed = releaseDate.trim()
            // If it's a pure number (e.g. "2023" or "2023.0")
            val asNum = trimmed.toDoubleOrNull()
            if (asNum != null) {
                val year = asNum.toInt()
                if (year in 1900..2099) return year.toString()
            }
            // Extract 4-digit year from date strings like "2023-05-12", "2023-05-12T10:00:00Z"
            val match = Regex("""\b(19\d{2}|20\d{2})\b""").find(trimmed)
            if (match != null) return match.value
            if (trimmed.length >= 4) return trimmed.substring(0, 4)
            return trimmed
        }
        // Fallback to rawYear (integer year field from API e.g. "year": 2023)
        if (rawYear != null) {
            val str = rawYear.toString().trim()
            val asNum = str.toDoubleOrNull()
            if (asNum != null) {
                val year = asNum.toInt()
                if (year in 1900..2099) return year.toString()
            }
            val match = Regex("""\b(19\d{2}|20\d{2})\b""").find(str)
            if (match != null) return match.value
        }
        return ""
    }

    fun getQualityBadge(): String {
        val sNum = seasonNumber
        val epNum = episodeNumber
        if (sNum != null || epNum != null) {
            return "S${sNum ?: 1}E${epNum ?: 1}"
        }

        if (newEpisodes != null) {
            val str = newEpisodes.toString().trim()
            // Gson deserializes JSON numbers as Double (e.g. newEpisodes:2 → "2.0")
            // so we check via toDoubleOrNull() instead of toIntOrNull()
            val isNew = str == "true" || str.equals("new", true) ||
                str.toDoubleOrNull()?.let { it > 0.0 } == true
            if (isNew) return "NEW"
        }

        val q = quality?.trim()?.uppercase() ?: ""
        val sub = subtitle?.trim()?.uppercase() ?: ""
        val t = type?.trim()?.uppercase() ?: ""

        if (q == "NEW" || sub == "NEW" || t == "NEW") return "NEW"
        if (q.contains("HDCAM") || sub.contains("HDCAM")) return "HDCAM"
        if (q.contains("CAM") || sub.contains("CAM")) return "CAM"
        if (q.contains("HD") || sub.contains("HD")) return "HD"

        if (q.isNotBlank()) return q
        if (sub.isNotBlank()) return sub
        return ""
    }
}

data class VideoItem(val id: Long, val server: String?, var link: String?, val lang: String?) : java.io.Serializable
data class CastItem(val id: Long, val name: String?, val profile_path: String?, val character: String?) : java.io.Serializable
data class EpisodeItem(
    val id: Long,
    @SerializedName("episode_number", alternate = ["episode_no"]) val episode_number: Int?,
    @SerializedName("season_number", alternate = ["season_no"]) val season_number: Int? = null,
    @SerializedName("name", alternate = ["title"]) val name: String?,
    val overview: String?,
    @SerializedName("still_path_tv", alternate = ["still_path", "poster_path", "backdrop_path", "image", "still", "img", "thumbnail"]) val still_path_tv: String?,
    val videos: List<VideoItem>?
) : java.io.Serializable

data class SeasonItem(
    val id: Long,
    @SerializedName("season_number", alternate = ["season_no"]) val season_number: Int?,
    val name: String?,
    val episodes: List<EpisodeItem>?
) : java.io.Serializable

data class SearchResponse(
    @SerializedName("search", alternate = ["data", "results", "movies", "series"])
    val results: List<MediaItem>?
)

data class LanguageItem(
    val name: String? = null,
    val english_name: String? = null
) : java.io.Serializable

data class DetailData(
    val id: Long,
    val title: String?,
    val name: String?,
    val poster_path: String?,
    val backdrop_path: String?,
    val backdrop_path_tv: String?,
    val overview: String?,
    val vote_average: Double?,
    val rating: Double? = null,
    val quality: String? = null,
    val badge: String? = null,
    val subtitle: String?,
    val tagline: String? = null,
    val original_title: String? = null,
    val release_date: String?,
    val first_air_date: String?,
    val runtime: Int?,
    val views: Long?,
    val genres: List<Genre>?,
    val genreslist: List<String>?,
    val seasons: List<SeasonItem>?,
    val videos: List<VideoItem>?,
    val casterslist: List<CastItem>?,
    val cast: List<CastItem>? = null,
    val spoken_languages: List<LanguageItem>? = null,
    @SerializedName("trailer_url", alternate = ["trailer", "youtube_trailer", "youtube_id", "trailer_key", "trailerUrl"]) val trailer_url: String? = null,
    @SerializedName("preview_path", alternate = ["preview", "trailer_path", "preview_url"]) val preview_path: String? = null,
    @SerializedName("relateds", alternate = ["related", "related_movies", "related_series", "recommendations"]) val relateds: List<MediaItem>? = null
) : java.io.Serializable {
    fun getDisplayLanguages(): String {
        val list = spoken_languages?.mapNotNull { it.name ?: it.english_name }?.filter { it.isNotBlank() }
        if (!list.isNullOrEmpty()) return list.joinToString(", ")
        return ""
    }
}

data class DetailResponseWrapper(
    val movie: DetailData?,
    val serie: DetailData?,
    val media: DetailData?,
    val id: Long?,
    val title: String?,
    val name: String?,
    val poster_path: String?,
    val backdrop_path: String?,
    val backdrop_path_tv: String?,
    val overview: String?,
    val vote_average: Double?,
    val rating: Double? = null,
    val quality: String? = null,
    val badge: String? = null,
    val subtitle: String?,
    val tagline: String? = null,
    val original_title: String? = null,
    val release_date: String?,
    val first_air_date: String?,
    val runtime: Int?,
    val views: Long?,
    val genres: List<Genre>?,
    val genreslist: List<String>?,
    val seasons: List<SeasonItem>?,
    val videos: List<VideoItem>?,
    val casterslist: List<CastItem>?,
    val cast: List<CastItem>?,
    val spoken_languages: List<LanguageItem>?,
    @SerializedName("trailer_url", alternate = ["trailer", "youtube_trailer", "youtube_id", "trailer_key", "trailerUrl"]) val trailer_url: String?,
    @SerializedName("preview_path", alternate = ["preview", "trailer_path", "preview_url"]) val preview_path: String?,
    @SerializedName("relateds", alternate = ["related", "related_movies", "related_series", "recommendations"]) val relateds: List<MediaItem>?
) {
    fun toDetailData(): DetailData {
        val base = movie ?: serie ?: media
        if (base != null) {
            val mergedCast = base.casterslist ?: this.casterslist ?: base.cast ?: this.cast
            val mergedRelated = base.relateds ?: this.relateds
            val mergedSeasons = base.seasons ?: this.seasons
            val mergedVideos = base.videos ?: this.videos
            val mergedTrailer = base.trailer_url ?: this.trailer_url
            val mergedPreview = base.preview_path ?: this.preview_path
            val mergedGenres = base.genres ?: this.genres
            val mergedGenresList = base.genreslist ?: this.genreslist
            val mergedLanguages = base.spoken_languages ?: this.spoken_languages

            return DetailData(
                id = base.id.takeIf { it != 0L } ?: id ?: 0L,
                title = base.title ?: title,
                name = base.name ?: name,
                poster_path = base.poster_path ?: poster_path,
                backdrop_path = base.backdrop_path ?: backdrop_path,
                backdrop_path_tv = base.backdrop_path_tv ?: backdrop_path_tv,
                overview = base.overview ?: overview,
                vote_average = base.vote_average ?: vote_average,
                rating = base.rating ?: rating,
                quality = base.quality ?: quality,
                badge = base.badge ?: badge,
                subtitle = base.subtitle ?: subtitle,
                tagline = base.tagline ?: tagline,
                original_title = base.original_title ?: original_title,
                release_date = base.release_date ?: release_date,
                first_air_date = base.first_air_date ?: first_air_date,
                runtime = base.runtime ?: runtime,
                views = base.views ?: views,
                genres = mergedGenres,
                genreslist = mergedGenresList,
                seasons = mergedSeasons,
                videos = mergedVideos,
                casterslist = mergedCast,
                cast = mergedCast,
                spoken_languages = mergedLanguages,
                trailer_url = mergedTrailer,
                preview_path = mergedPreview,
                relateds = mergedRelated
            )
        }
        return DetailData(
            id = id ?: 0L,
            title = title,
            name = name,
            poster_path = poster_path,
            backdrop_path = backdrop_path,
            backdrop_path_tv = backdrop_path_tv,
            overview = overview,
            vote_average = vote_average,
            rating = rating,
            quality = quality,
            badge = badge,
            subtitle = subtitle,
            tagline = tagline,
            original_title = original_title,
            release_date = release_date,
            first_air_date = first_air_date,
            runtime = runtime,
            views = views,
            genres = genres,
            genreslist = genreslist,
            seasons = seasons,
            videos = videos,
            casterslist = casterslist ?: cast,
            cast = cast ?: casterslist,
            spoken_languages = spoken_languages,
            trailer_url = trailer_url,
            preview_path = preview_path,
            relateds = relateds
        )
    }
}

data class Genre(
    @SerializedName("id") val rawId: Any = "",
    val name: String = ""
) : java.io.Serializable {
    val id: String
        get() = rawId.toString()
}

data class CastFilmographyResponse(
    val results: List<MediaItem>? = null,
    val movies: List<MediaItem>? = null,
    val series: List<MediaItem>? = null,
    val data: List<MediaItem>? = null
) : java.io.Serializable {
    fun getAllItems(): List<MediaItem> {
        return results ?: data ?: ((movies ?: emptyList()) + (series ?: emptyList()))
    }
}