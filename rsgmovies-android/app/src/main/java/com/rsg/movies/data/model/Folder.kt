package com.rsg.movies.data.model

import android.os.Parcelable
import com.google.gson.annotations.SerializedName
import kotlinx.parcelize.Parcelize

data class FolderResponse(
    @SerializedName("space_used") val space_used: Long? = 0L,
    @SerializedName("space_max") val space_max: Long? = 2147483648L,
    @SerializedName("folders") val folders: List<Folder> = emptyList()
)

@Parcelize
data class Folder(
    val id: Long,
    val name: String,
    val fullname: String? = "",
    val size: Long = 0L,
    val play_audio: Boolean = false,
    val play_video: Boolean = false,
    val is_shared: Boolean = false,
    val last_update: String? = ""
) : Parcelable
