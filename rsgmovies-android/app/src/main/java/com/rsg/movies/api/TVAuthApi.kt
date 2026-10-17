package com.rsg.movies.api

import com.google.gson.annotations.SerializedName
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

data class QRInitRequest(
    @SerializedName("device_id") val deviceId: String,
    @SerializedName("device_name") val deviceName: String = "Android TV"
)

data class QRInitResponse(
    @SerializedName("request_id") val requestId: String,
    @SerializedName("qr_code_url") val qrCodeUrl: String? = null,
    @SerializedName("expires_in_seconds") val expiresInSeconds: Int = 300
)

data class QRPollResponse(
    @SerializedName("status") val status: String,
    @SerializedName("session_token") val sessionToken: String? = null,
    @SerializedName("message") val message: String? = null
)

interface TVAuthApi {
    @POST("api/tv/auth/qr/init/")
    suspend fun initQR(@Body request: QRInitRequest): Response<QRInitResponse>

    @GET("api/tv/auth/qr/poll/")
    suspend fun pollQR(
        @Query("request_id") requestId: String,
        @Query("device_id") deviceId: String
    ): Response<QRPollResponse>

    @GET("api/tv/config/")
    suspend fun getTVConfig(
        @Query("platform") platform: String = "AndroidTV",
        @Query("version") version: String = "1.0.0"
    ): Response<com.rsg.movies.data.model.TVConfigResponse>

    @GET("api/tv/session/validate/")
    suspend fun validateSession(): Response<com.rsg.movies.data.model.ValidateSessionResponse>

    @POST("api/tv/session/logout/")
    suspend fun logout(): Response<ResponseBody>
}
