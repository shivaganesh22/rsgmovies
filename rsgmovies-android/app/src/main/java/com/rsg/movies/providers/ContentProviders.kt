package com.rsg.movies.providers

import com.google.gson.Gson
import com.google.gson.JsonElement
import com.google.gson.reflect.TypeToken
import com.rsg.movies.api.GenreResponse
import com.rsg.movies.data.ConfigManager
import com.rsg.movies.data.api.ApiClient
import com.rsg.movies.data.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit

interface IContentProvider {
    suspend fun getHome(): HomeResponse?
    suspend fun getMovies(page: Int = 1): MediaListResponse?
    suspend fun getMoviesFilter(filter: String, page: Int = 1): MediaListResponse?
    suspend fun getMoviesByGenre(genreId: String, page: Int = 1): MediaListResponse?
    suspend fun getMovieDetails(id: String): DetailData?
    suspend fun getMovieRelated(id: String): List<MediaItem>?
    suspend fun getSeries(page: Int = 1): MediaListResponse?
    suspend fun getSeriesFilter(filter: String, page: Int = 1): MediaListResponse?
    suspend fun getSeriesByGenre(genreId: String, page: Int = 1): MediaListResponse?
    suspend fun getSeriesDetails(id: String): DetailData?
    suspend fun getSeriesRelated(id: String): List<MediaItem>?
    suspend fun getCastFilmography(castId: String, page: Int = 1): MediaListResponse?
    suspend fun getGenres(): List<Genre>
    suspend fun search(query: String): List<MediaItem>
    suspend fun getCategoryItems(category: String, page: Int = 1): MediaListResponse?
}

fun parseRelatedJson(json: JsonElement?): List<MediaItem> {
    if (json == null || json.isJsonNull) return emptyList()
    val gson = Gson()
    return try {
        if (json.isJsonArray) {
            val type = object : TypeToken<List<MediaItem>>() {}.type
            gson.fromJson(json, type) ?: emptyList()
        } else if (json.isJsonObject) {
            val obj = json.asJsonObject
            val listKey = when {
                obj.has("relateds") && obj.get("relateds").isJsonArray -> "relateds"
                obj.has("movies") && obj.get("movies").isJsonArray -> "movies"
                obj.has("series") && obj.get("series").isJsonArray -> "series"
                obj.has("results") && obj.get("results").isJsonArray -> "results"
                obj.has("data") && obj.get("data").isJsonArray -> "data"
                else -> null
            }
            if (listKey != null) {
                val type = object : TypeToken<List<MediaItem>>() {}.type
                gson.fromJson(obj.getAsJsonArray(listKey), type) ?: emptyList()
            } else {
                emptyList()
            }
        } else {
            emptyList()
        }
    } catch (_: Exception) {
        emptyList()
    }
}

fun parseCastJson(json: JsonElement?, page: Int = 1): MediaListResponse? {
    if (json == null || json.isJsonNull) return null
    val gson = Gson()
    return try {
        if (json.isJsonObject) {
            val obj = json.asJsonObject
            val listKey = when {
                obj.has("results") && obj.get("results").isJsonArray -> "results"
                obj.has("movies") && obj.get("movies").isJsonArray -> "movies"
                obj.has("series") && obj.get("series").isJsonArray -> "series"
                obj.has("data") && obj.get("data").isJsonArray -> "data"
                else -> null
            }
            if (listKey != null) {
                val type = object : TypeToken<List<MediaItem>>() {}.type
                val items: List<MediaItem> = gson.fromJson(obj.getAsJsonArray(listKey), type) ?: emptyList()
                val totalPages = if (obj.has("total_pages")) obj.get("total_pages").asInt else (if (obj.has("last_page")) obj.get("last_page").asInt else 1)
                MediaListResponse(current_page = page, last_page = totalPages, data = items)
            } else {
                val filmography = gson.fromJson(json, CastFilmographyResponse::class.java)
                val allItems = filmography?.getAllItems() ?: emptyList()
                MediaListResponse(current_page = page, last_page = 1, data = allItems)
            }
        } else if (json.isJsonArray) {
            val type = object : TypeToken<List<MediaItem>>() {}.type
            val items: List<MediaItem> = gson.fromJson(json, type) ?: emptyList()
            MediaListResponse(current_page = page, last_page = 1, data = items)
        } else {
            null
        }
    } catch (_: Exception) {
        null
    }
}

object ContentCache {
    private val cache = java.util.concurrent.ConcurrentHashMap<String, Any>()

    @Suppress("UNCHECKED_CAST")
    fun <T> get(key: String): T? = cache[key] as? T

    fun put(key: String, data: Any?) {
        if (data != null) {
            cache[key] = data
        }
    }

    fun clear() {
        cache.clear()
    }
}

class BackendContentProvider : IContentProvider {

    override suspend fun getHome(): HomeResponse? {
        ContentCache.get<HomeResponse>("bk_home")?.let { return it }
        val resp = ApiClient.apiService.getBlastHome()
        val data = if (resp.isSuccessful) resp.body() else null
        data?.let { ContentCache.put("bk_home", it) }
        return data
    }

    override suspend fun getMovies(page: Int): MediaListResponse? {
        val key = "bk_movies_$page"
        ContentCache.get<MediaListResponse>(key)?.let { return it }
        val resp = ApiClient.apiService.getBlastMovies(page)
        val data = if (resp.isSuccessful) resp.body() else null
        data?.let { ContentCache.put(key, it) }
        return data
    }

    override suspend fun getMoviesFilter(filter: String, page: Int): MediaListResponse? {
        if (filter == "all" || filter.isBlank() || filter == "latestadded") {
            return getMovies(page)
        }
        val sort = filter.trim()
        val key = "bk_movies_filter_${sort}_$page"
        ContentCache.get<MediaListResponse>(key)?.let { return it }
        val resp = ApiClient.apiService.getBlastMoviesFilter(sort, page)
        val data = if (resp.isSuccessful) resp.body() else null
        data?.let { ContentCache.put(key, it) }
        return data
    }

    override suspend fun getMoviesByGenre(genreId: String, page: Int): MediaListResponse? {
        val key = "bk_movies_genre_${genreId}_$page"
        ContentCache.get<MediaListResponse>(key)?.let { return it }
        val resp = ApiClient.apiService.getBlastMoviesByGenre(genreId, page)
        val data = if (resp.isSuccessful) resp.body() else null
        data?.let { ContentCache.put(key, it) }
        return data
    }

    override suspend fun getMovieDetails(id: String): DetailData? {
        val key = "bk_movie_detail_$id"
        ContentCache.get<DetailData>(key)?.let { return it }
        val resp = ApiClient.apiService.getBlastMovieDetail(id)
        val data = if (resp.isSuccessful && resp.body() != null) resp.body()!!.toDetailData() else null
        data?.let { ContentCache.put(key, it) }
        return data
    }

    override suspend fun getMovieRelated(id: String): List<MediaItem>? {
        val key = "bk_movie_related_$id"
        ContentCache.get<List<MediaItem>>(key)?.let { return it }
        val resp = ApiClient.apiService.getBlastMovieRelated(id)
        val data = if (resp.isSuccessful && resp.body() != null) parseRelatedJson(resp.body()) else emptyList()
        if (data.isNotEmpty()) ContentCache.put(key, data)
        return data
    }

    override suspend fun getSeries(page: Int): MediaListResponse? {
        val key = "bk_series_$page"
        ContentCache.get<MediaListResponse>(key)?.let { return it }
        val resp = ApiClient.apiService.getBlastSeries(page)
        val data = if (resp.isSuccessful) resp.body() else null
        data?.let { ContentCache.put(key, it) }
        return data
    }

    override suspend fun getSeriesFilter(filter: String, page: Int): MediaListResponse? {
        if (filter == "all" || filter.isBlank() || filter == "latestadded") {
            return getSeries(page)
        }
        val sort = filter.trim()
        val key = "bk_series_filter_${sort}_$page"
        ContentCache.get<MediaListResponse>(key)?.let { return it }
        val resp = ApiClient.apiService.getBlastSeriesFilter(sort, page)
        val data = if (resp.isSuccessful) resp.body() else null
        data?.let { ContentCache.put(key, it) }
        return data
    }

    override suspend fun getSeriesByGenre(genreId: String, page: Int): MediaListResponse? {
        val key = "bk_series_genre_${genreId}_$page"
        ContentCache.get<MediaListResponse>(key)?.let { return it }
        val resp = ApiClient.apiService.getBlastSeriesByGenre(genreId, page)
        val data = if (resp.isSuccessful) resp.body() else null
        data?.let { ContentCache.put(key, it) }
        return data
    }

    override suspend fun getSeriesDetails(id: String): DetailData? {
        val key = "bk_series_detail_$id"
        ContentCache.get<DetailData>(key)?.let { return it }
        val resp = ApiClient.apiService.getBlastSeriesDetail(id)
        val data = if (resp.isSuccessful && resp.body() != null) resp.body()!!.toDetailData() else null
        data?.let { ContentCache.put(key, it) }
        return data
    }

    override suspend fun getSeriesRelated(id: String): List<MediaItem>? {
        val key = "bk_series_related_$id"
        ContentCache.get<List<MediaItem>>(key)?.let { return it }
        val resp = ApiClient.apiService.getBlastSeriesRelated(id)
        val data = if (resp.isSuccessful && resp.body() != null) parseRelatedJson(resp.body()) else emptyList()
        if (data.isNotEmpty()) ContentCache.put(key, data)
        return data
    }

    override suspend fun getGenres(): List<Genre> {
        val key = "bk_genres"
        ContentCache.get<List<Genre>>(key)?.let { return it }
        val resp = ApiClient.apiService.getBlastGenres()
        val data = resp.body()?.genres ?: emptyList()
        if (data.isNotEmpty()) ContentCache.put(key, data)
        return data
    }

    override suspend fun search(query: String): List<MediaItem> {
        val resp = ApiClient.apiService.getBlastSearch(query)
        return if (resp.isSuccessful && resp.body()?.results != null) resp.body()!!.results!! else emptyList()
    }

    override suspend fun getCategoryItems(category: String, page: Int): MediaListResponse? {
        val key = "bk_cat_${category}_$page"
        ContentCache.get<MediaListResponse>(key)?.let { return it }
        val blastCategory = when (category) {
            "latest_episodes", "latest_series_episodes", "episodes" -> "latest_series_episodes"
            "pinned" -> "pinned"
            "new_hd" -> "new_hd"
            "latest_movies" -> "latest_movies"
            "recommended" -> "recommended"
            "trending" -> "trending"
            "choosed" -> "choosed"
            "popular_series", "popularSeries" -> "popular_series"
            "recently_added", "latest", "recents" -> "recently_added"
            "latest_series" -> "latest_series"
            "thisweek", "this_week", "next_this_week" -> "next_this_week"
            "most_popular", "popular" -> "most_popular"
            else -> category
        }
        val resp = ApiClient.apiService.getBlastCategory(blastCategory, page)
        val data = if (resp.isSuccessful) resp.body() else null
        data?.let { ContentCache.put(key, it) }
        return data
    }

    override suspend fun getCastFilmography(castId: String, page: Int): MediaListResponse? {
        val key = "bk_cast_${castId}_$page"
        ContentCache.get<MediaListResponse>(key)?.let { return it }
        val resp = ApiClient.apiService.getBlastCast(castId, page)
        val data = if (resp.isSuccessful && resp.body() != null) parseCastJson(resp.body(), page) else null
        data?.let { ContentCache.put(key, it) }
        return data
    }
}

class DirectContentProvider(private val blastConfig: BlastConfig) : IContentProvider {
    private val client = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .build()

    private val gson = Gson()

    private fun getBaseUrl(): String {
        var base = blastConfig.domain.trim()
        if (!base.endsWith("/")) base += "/"
        return base
    }

    private fun signBlastUrl(urlStr: String?): String {
        if (urlStr.isNullOrBlank()) return ""
        val secretKey = blastConfig.decrypt?.trim()
        if (secretKey.isNullOrBlank()) return urlStr
        return try {
            var safeUrl = urlStr.trim()
            if (!safeUrl.startsWith("http://", ignoreCase = true) && !safeUrl.startsWith("https://", ignoreCase = true)) {
                safeUrl = "https://$safeUrl"
            } else if (safeUrl.startsWith("http://", ignoreCase = true)) {
                safeUrl = "https://" + safeUrl.substring(7)
            }

            val uri = java.net.URI(safeUrl)
            val path = uri.path
            val timestamp = System.currentTimeMillis() / 1000L
            val dataToSign = "$path$timestamp".toByteArray(Charsets.UTF_8)

            val mac = javax.crypto.Mac.getInstance("HmacSHA256")
            val keySpec = javax.crypto.spec.SecretKeySpec(secretKey.toByteArray(Charsets.UTF_8), "HmacSHA256")
            mac.init(keySpec)
            val rawHmac = mac.doFinal(dataToSign)
            val base64Hash = android.util.Base64.encodeToString(rawHmac, android.util.Base64.NO_WRAP)
            val urlEncodedHash = java.net.URLEncoder.encode(base64Hash, "UTF-8")

            val delimiter = if (uri.query != null && uri.query.isNotEmpty()) "&" else "?"
            "$safeUrl${delimiter}verify=$timestamp-$urlEncodedHash"
        } catch (_: Exception) {
            urlStr
        }
    }

    private suspend fun executeGet(path: String): String? = withContext(Dispatchers.IO) {
        try {
            val cleanPath = path.trimStart('/')
            val fullUrl = "${getBaseUrl()}$cleanPath"
            val req = Request.Builder()
                .url(fullUrl)
                .addHeader("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36")
                .addHeader("X-Client", "TV")
                .addHeader("Authorization", "Bearer ${blastConfig.token.trim()}")
                .build()
            val resp = client.newCall(req).execute()
            if (resp.isSuccessful) resp.body?.string() else null
        } catch (_: Exception) {
            null
        }
    }

    override suspend fun getHome(): HomeResponse? {
        ContentCache.get<HomeResponse>("dir_home")?.let { return it }
        val json = executeGet("api/media/mobile/${blastConfig.endpoint}") ?: return null
        val data = try { gson.fromJson(json, HomeResponse::class.java) } catch (_: Exception) { null }
        data?.let { ContentCache.put("dir_home", it) }
        return data
    }

    override suspend fun getMovies(page: Int): MediaListResponse? {
        val key = "dir_movies_$page"
        ContentCache.get<MediaListResponse>(key)?.let { return it }
        val json = executeGet("api/genres/movies/all/${blastConfig.endpoint}?page=$page") ?: return null
        val data = try { gson.fromJson(json, MediaListResponse::class.java) } catch (_: Exception) { null }
        data?.let { ContentCache.put(key, it) }
        return data
    }

    override suspend fun getMoviesFilter(filter: String, page: Int): MediaListResponse? {
        if (filter == "all" || filter == "latestadded" || filter.isBlank()) {
            return getMovies(page)
        }
        val sort = filter.trim()
        val key = "dir_movies_filter_${sort}_$page"
        ContentCache.get<MediaListResponse>(key)?.let { return it }
        val json = executeGet("api/movies/$sort/${blastConfig.endpoint}?page=$page") ?: return null
        val data = try { gson.fromJson(json, MediaListResponse::class.java) } catch (_: Exception) { null }
        data?.let { ContentCache.put(key, it) }
        return data
    }

    override suspend fun getMoviesByGenre(genreId: String, page: Int): MediaListResponse? {
        val key = "dir_movies_genre_${genreId}_$page"
        ContentCache.get<MediaListResponse>(key)?.let { return it }
        val json = executeGet("api/genres/mediaLibrary/show/$genreId/movie/${blastConfig.endpoint}?page=$page") ?: return null
        val data = try { gson.fromJson(json, MediaListResponse::class.java) } catch (_: Exception) { null }
        data?.let { ContentCache.put(key, it) }
        return data
    }

    override suspend fun getMovieDetails(id: String): DetailData? {
        val key = "dir_movie_detail_$id"
        ContentCache.get<DetailData>(key)?.let { return it }
        val json = executeGet("api/media/detail/$id/${blastConfig.endpoint}") ?: return null
        val data = try {
            val wrapper = gson.fromJson(json, DetailResponseWrapper::class.java)
            val detail = wrapper?.toDetailData() ?: gson.fromJson(json, DetailData::class.java)
            detail?.videos?.forEach { vid ->
                if (!vid.link.isNullOrBlank()) {
                    vid.link = signBlastUrl(vid.link)
                }
            }
            detail
        } catch (_: Exception) { null }
        data?.let { ContentCache.put(key, it) }
        return data
    }

    override suspend fun getMovieRelated(id: String): List<MediaItem>? {
        val key = "dir_movie_related_$id"
        ContentCache.get<List<MediaItem>>(key)?.let { return it }
        val json = executeGet("api/media/relateds/$id/${blastConfig.endpoint}") ?: return emptyList()
        val data = try {
            val element = gson.fromJson(json, JsonElement::class.java)
            parseRelatedJson(element)
        } catch (_: Exception) { emptyList() }
        if (data.isNotEmpty()) ContentCache.put(key, data)
        return data
    }

    override suspend fun getSeries(page: Int): MediaListResponse? {
        val key = "dir_series_$page"
        ContentCache.get<MediaListResponse>(key)?.let { return it }
        val json = executeGet("api/genres/series/all/${blastConfig.endpoint}?page=$page") ?: return null
        val data = try { gson.fromJson(json, MediaListResponse::class.java) } catch (_: Exception) { null }
        data?.let { ContentCache.put(key, it) }
        return data
    }

    override suspend fun getSeriesFilter(filter: String, page: Int): MediaListResponse? {
        if (filter == "all" || filter == "latestadded" || filter.isBlank()) {
            return getSeries(page)
        }
        val sort = filter.trim()
        val key = "dir_series_filter_${sort}_$page"
        ContentCache.get<MediaListResponse>(key)?.let { return it }
        val json = executeGet("api/series/$sort/${blastConfig.endpoint}?page=$page") ?: return null
        val data = try { gson.fromJson(json, MediaListResponse::class.java) } catch (_: Exception) { null }
        data?.let { ContentCache.put(key, it) }
        return data
    }

    override suspend fun getSeriesByGenre(genreId: String, page: Int): MediaListResponse? {
        val key = "dir_series_genre_${genreId}_$page"
        ContentCache.get<MediaListResponse>(key)?.let { return it }
        val json = executeGet("api/genres/mediaLibrary/show/$genreId/serie/${blastConfig.endpoint}?page=$page") ?: return null
        val data = try { gson.fromJson(json, MediaListResponse::class.java) } catch (_: Exception) { null }
        data?.let { ContentCache.put(key, it) }
        return data
    }

    override suspend fun getSeriesDetails(id: String): DetailData? {
        val key = "dir_series_detail_$id"
        ContentCache.get<DetailData>(key)?.let { return it }
        val json = executeGet("api/series/show/$id/${blastConfig.endpoint}") ?: return null
        val data = try {
            val wrapper = gson.fromJson(json, DetailResponseWrapper::class.java)
            val detail = wrapper?.toDetailData() ?: gson.fromJson(json, DetailData::class.java)
            detail?.seasons?.forEach { season ->
                season.episodes?.forEach { ep ->
                    ep.videos?.forEach { vid ->
                        if (!vid.link.isNullOrBlank()) {
                            vid.link = signBlastUrl(vid.link)
                        }
                    }
                }
            }
            detail
        } catch (_: Exception) { null }
        data?.let { ContentCache.put(key, it) }
        return data
    }

    override suspend fun getSeriesRelated(id: String): List<MediaItem>? {
        val key = "dir_series_related_$id"
        ContentCache.get<List<MediaItem>>(key)?.let { return it }
        val json = executeGet("api/series/relateds/$id/${blastConfig.endpoint}") ?: return emptyList()
        val data = try {
            val element = gson.fromJson(json, JsonElement::class.java)
            parseRelatedJson(element)
        } catch (_: Exception) { emptyList() }
        if (data.isNotEmpty()) ContentCache.put(key, data)
        return data
    }

    override suspend fun getCastFilmography(castId: String, page: Int): MediaListResponse? {
        val key = "dir_cast_${castId}_$page"
        ContentCache.get<MediaListResponse>(key)?.let { return it }
        val json = executeGet("api/filmographie/detail/$castId/${blastConfig.endpoint}?page=$page") ?: return null
        val data = try {
            val element = gson.fromJson(json, JsonElement::class.java)
            parseCastJson(element, page)
        } catch (_: Exception) { null }
        data?.let { ContentCache.put(key, it) }
        return data
    }

    override suspend fun getGenres(): List<Genre> {
        val key = "dir_genres"
        ContentCache.get<List<Genre>>(key)?.let { return it }
        val json = executeGet("api/genres/list/${blastConfig.endpoint}") ?: return emptyList()
        val data = try {
            val resp = gson.fromJson(json, GenreResponse::class.java)
            resp?.genres ?: emptyList()
        } catch (_: Exception) { emptyList() }
        if (data.isNotEmpty()) ContentCache.put(key, data)
        return data
    }

    override suspend fun search(query: String): List<MediaItem> {
        val json = executeGet("api/search/$query/${blastConfig.endpoint}") ?: return emptyList()
        return try {
            val resp = gson.fromJson(json, SearchResponse::class.java)
            resp?.results ?: emptyList()
        } catch (_: Exception) { emptyList() }
    }

    override suspend fun getCategoryItems(category: String, page: Int): MediaListResponse? {
        val key = "dir_cat_${category}_$page"
        ContentCache.get<MediaListResponse>(key)?.let { return it }
        val directPath = when (category) {
            "pinned" -> "api/genres/pinned/all/${blastConfig.endpoint}?page=$page"
            "new_hd" -> "api/genres/media/names/New%20HD%20Released/${blastConfig.endpoint}?page=$page"
            "recently_added", "latest", "recents" -> "api/genres/new/all/${blastConfig.endpoint}?page=$page"
            "latest_episodes", "latest_series_episodes", "episodes" -> "api/media/seriesEpisodesAll/${blastConfig.endpoint}?page=$page"
            "recommended" -> "api/genres/recommended/all/${blastConfig.endpoint}?page=$page"
            "trending" -> "api/genres/trending/all/${blastConfig.endpoint}?page=$page"
            "choosed" -> "api/genres/choosed/all/${blastConfig.endpoint}?page=$page"
            "popular_series", "popularSeries" -> "api/genres/popularseries/all/${blastConfig.endpoint}?page=$page"
            "latest_series" -> "api/genres/latestseries/all/${blastConfig.endpoint}?page=$page"
            "latest_movies" -> "api/genres/latestmovies/all/${blastConfig.endpoint}?page=$page"
            "thisweek", "this_week", "next_this_week" -> "api/genres/thisweek/all/${blastConfig.endpoint}?page=$page"
            "most_popular", "popular" -> "api/genres/popularmovies/all/${blastConfig.endpoint}?page=$page"
            else -> "api/genres/$category/all/${blastConfig.endpoint}?page=$page"
        }
        val json = executeGet(directPath) ?: return null
        val data = try { gson.fromJson(json, MediaListResponse::class.java) } catch (_: Exception) { null }
        data?.let { ContentCache.put(key, it) }
        return data
    }
}

object ContentProviderFactory {
    fun create(): IContentProvider {
        val blast = ConfigManager.blastConfig
        val dataMode = ConfigManager.dataMode
        return if (dataMode.equals("DIRECT", ignoreCase = true) && blast != null && blast.domain.isNotBlank()) {
            DirectContentProvider(blast)
        } else {
            BackendContentProvider()
        }
    }
}
