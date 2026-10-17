package com.rsg.movies.api

import com.rsg.movies.data.model.AppConfigResponse
import com.rsg.movies.data.model.DetailResponseWrapper
import com.rsg.movies.data.model.Genre
import com.rsg.movies.data.model.HomeResponse
import com.rsg.movies.data.model.MediaItem
import com.rsg.movies.data.model.MediaListResponse
import com.rsg.movies.data.model.SearchResponse
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query
import retrofit2.http.Url

data class GenreResponse(
    val genres: List<Genre>? = null
)

interface OttApiService {

    @GET("react/blast/config/")
    suspend fun getAppConfig(): Response<AppConfigResponse>

    @GET("react/blast/home/")
    suspend fun getBlastHome(): Response<HomeResponse>

    @GET("react/blast/movies/")
    suspend fun getBlastMovies(@Query("page") page: Int = 1): Response<MediaListResponse>

    @GET("react/blast/movies_filter/")
    suspend fun getBlastMoviesFilter(@Query("filter") filter: String, @Query("page") page: Int = 1): Response<MediaListResponse>

    @GET("react/blast/movies_genre/{id}/")
    suspend fun getBlastMoviesByGenre(@Path("id") genreId: String, @Query("page") page: Int = 1): Response<MediaListResponse>

    @GET("react/blast/series/")
    suspend fun getBlastSeries(@Query("page") page: Int = 1): Response<MediaListResponse>

    @GET("react/blast/series_filter/")
    suspend fun getBlastSeriesFilter(@Query("filter") filter: String, @Query("page") page: Int = 1): Response<MediaListResponse>

    @GET("react/blast/series_genre/{id}/")
    suspend fun getBlastSeriesByGenre(@Path("id") genreId: String, @Query("page") page: Int = 1): Response<MediaListResponse>

    @GET("react/blast/movie/{id}/")
    suspend fun getBlastMovieDetail(@Path("id") id: String): Response<DetailResponseWrapper>

    @GET("react/blast/series/{id}/")
    suspend fun getBlastSeriesDetail(@Path("id") id: String): Response<DetailResponseWrapper>

    @GET("react/blast/movie/{id}/related/")
    suspend fun getBlastMovieRelated(@Path("id") id: String): Response<com.google.gson.JsonElement>

    @GET("react/blast/series/{id}/related/")
    suspend fun getBlastSeriesRelated(@Path("id") id: String): Response<com.google.gson.JsonElement>

    @GET("react/blast/cast/{id}/")
    suspend fun getBlastCast(@Path("id") id: String, @Query("page") page: Int = 1): Response<com.google.gson.JsonElement>

    @GET("react/blast/{category}/")
    suspend fun getBlastCategory(@Path("category") category: String, @Query("page") page: Int = 1): Response<MediaListResponse>

    @GET("react/blast/search/")
    suspend fun getBlastSearch(@Query("query") query: String): Response<SearchResponse>

    @GET("react/blast/genres/")
    suspend fun getBlastGenres(): Response<GenreResponse>

    @GET
    suspend fun getHome(@Url dynamicUrl: String): Response<HomeResponse>

    @GET
    suspend fun getCategoryPaginated(@Url dynamicUrl: String, @Query("page") page: Int): Response<MediaListResponse>

    @GET
    suspend fun getMediaDetails(@Url dynamicUrl: String): Response<DetailResponseWrapper>

    @GET
    suspend fun getRelatedMedia(@Url dynamicUrl: String): Response<com.google.gson.JsonElement>

    @GET
    suspend fun searchMedia(@Url dynamicUrl: String): Response<SearchResponse>

    @GET
    suspend fun getGenres(@Url dynamicUrl: String): Response<GenreResponse>

    @GET
    suspend fun getMediaList(@Url dynamicUrl: String): Response<MediaListResponse>
}