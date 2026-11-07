package com.rsg.movies.data.model

import com.google.gson.annotations.SerializedName
import java.io.Serializable

data class LiveTvResponse(
    val total: Int? = 0,
    @SerializedName("grand_total") val grandTotal: Int? = 0,
    val categories: List<String>? = null,
    val channels: List<LiveTvChannel>? = null
) : Serializable

data class LiveTvChannel(
    val id: String? = null,
    val name: String? = null,
    @SerializedName("raw_name") val rawName: String? = null,
    val quality: String? = null,
    val logo: String? = null,
    val category: String? = null,
    val group: String? = null,
    val country: String? = null,
    val url: String? = null
) : Serializable {

    fun getDisplayName(): String = name?.ifBlank { null } ?: rawName ?: "Live Channel"

    fun getQualityBadge(): String = quality?.ifBlank { null } ?: "HD"
}
