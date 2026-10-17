package com.rsg.movies.api

import com.rsg.movies.data.model.FolderResponse
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface ApiService {
    @GET("react/files/")
    suspend fun getFolders(@Header("Authorization") token: String): FolderResponse

    @POST("react/addtorrent/")
    suspend fun addTorrent(
        @Header("Authorization") token: String,
        @Query("link") link: String
    ): Response<ResponseBody>

    @DELETE("react/deletefolder/{id}")
    suspend fun deleteFolder(
        @Header("Authorization") token: String,
        @Path("id") folderId: String
    ): Response<ResponseBody>

    @GET("react/deletefolder/{id}")
    suspend fun deleteFolderGet(
        @Header("Authorization") token: String,
        @Path("id") folderId: String
    ): Response<ResponseBody>

    @DELETE("react/deletefile/{id}")
    suspend fun deleteFile(
        @Header("Authorization") token: String,
        @Path("id") fileId: String
    ): Response<ResponseBody>

    @GET("react/deletefile/{id}")
    suspend fun deleteFileGet(
        @Header("Authorization") token: String,
        @Path("id") fileId: String
    ): Response<ResponseBody>
}