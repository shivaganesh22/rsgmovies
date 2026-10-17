package com.rsg.movies.api

import com.google.gson.annotations.SerializedName
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.rsg.movies.data.model.Folder
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.Path

data class FolderFileItem(
    val id: Long = 0L,
    val folder_file_id: Long? = null,
    val file_id: Long? = null,
    val name: String = "",
    val size: Long = 0L,
    val play_video: Boolean = true
)

data class FolderContentsResponse(
    val folders: List<Folder> = emptyList(),
    val files: List<FolderFileItem> = emptyList()
)

data class FilePlayerResponse(
    val url: String? = null,
    val m3u8: String? = null,
    val stream_url: String? = null,
    val link: String? = null,
    val result: JsonElement? = null
) {
    fun getEffectiveStreamUrl(): String {
        var resUrl: String? = null
        if (result != null && result.isJsonObject) {
            resUrl = result.asJsonObject.get("url")?.asString
        } else if (result != null && result.isJsonPrimitive && result.asJsonPrimitive.isString) {
            resUrl = result.asString
        }
        return m3u8 ?: url ?: stream_url ?: link ?: resUrl ?: ""
    }
}

data class LegacyFolderFileResponse(
    val url: String = "",
    val name: String = "",
    val result: Boolean = false
)

interface FolderService {
    @GET("react/open/{folderId}")
    suspend fun openFolder(
        @Header("Authorization") token: String,
        @Path("folderId") folderId: String
    ): FolderContentsResponse

    @GET("react/folder/file/player/{fileId}")
    suspend fun getFolderFilePlayer(
        @Header("Authorization") token: String,
        @Path("fileId") fileId: String
    ): FilePlayerResponse

    @GET("react/file/player/{fileId}")
    suspend fun getFilePlayer(
        @Header("Authorization") token: String,
        @Path("fileId") fileId: String
    ): FilePlayerResponse

    @GET("react/folder/files/{folderId}")
    suspend fun getFolderFiles(
        @Header("Authorization") token: String,
        @Path("folderId") folderId: Int
    ): LegacyFolderFileResponse
}