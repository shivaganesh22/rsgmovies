package com.rsg.movies.data.model

import com.google.gson.annotations.SerializedName
import java.io.Serializable

data class MaintenanceInfo(
    val is_active: Boolean = false,
    val title: String? = "System Maintenance",
    val message: String? = "RSG Movies is currently undergoing scheduled maintenance. Please check back shortly."
) : Serializable

data class VersionInfo(
    val has_update: Boolean = false,
    val is_update_required: Boolean = false,
    val latest_version: String? = null,
    @SerializedName("min_supported_version", alternate = ["min_version"]) val min_supported_version: String? = null,
    val update_url: String? = null,
    val release_notes: String? = null,
    val platform: String? = null
) : Serializable

data class BlastConfig(
    val domain: String,
    val endpoint: String,
    val token: String,
    val decrypt: String? = null
) : Serializable

data class TVConfigResponse(
    val maintenance: MaintenanceInfo? = null,
    val version: VersionInfo? = null,
    val data_mode: String? = "BACKEND",
    val blast: BlastConfig? = null
) : Serializable

data class UserTVProfile(
    val username: String? = null,
    val display_name: String? = null,
    val email: String? = null,
    val role: String? = null,
    val is_admin: Boolean = false,
    val upn: String? = null
) : Serializable

data class ValidateSessionResponse(
    val valid: Boolean = false,
    val user: UserTVProfile? = null,
    val maintenance: MaintenanceInfo? = null
) : Serializable
