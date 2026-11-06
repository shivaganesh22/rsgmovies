package com.rsg.movies.api

import com.rsg.movies.data.model.*
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

interface ScrapersApiService {

    // ======================== MOVIERULZ ========================

    @GET("react/movierulz/")
    suspend fun getMovierulz(
        @Query("category") category: String = ""
    ): Response<MovierulzResponse>

    @GET("react/movierulz/movie/{slug}/")
    suspend fun getMovierulzMovie(
        @Path(value = "slug", encoded = true) slug: String
    ): Response<MovierulzMovieDetailResponse>

    @GET("react/movierulz/search/{query}/")
    suspend fun searchMovierulz(
        @Path("query") query: String
    ): Response<MovierulzResponse>


    // ======================== TAMILMV ========================

    @GET("react/tamilmv/")
    suspend fun getTamilmv(): Response<TamilmvFeedResponse>

    @GET("react/tamilmv/movie/")
    suspend fun getTamilmvMovie(
        @Query("link") link: String
    ): Response<TamilmvMovieDetailResponse>
}
