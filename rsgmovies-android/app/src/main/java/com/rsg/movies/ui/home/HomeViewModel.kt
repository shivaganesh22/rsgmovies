package com.rsg.movies.ui.home

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rsg.movies.data.ConfigManager
import com.rsg.movies.data.api.ApiClient
import com.rsg.movies.data.model.HomeResponse
import kotlinx.coroutines.launch

class HomeViewModel : ViewModel() {

    private val _homeData = MutableLiveData<HomeResponse?>()
    val homeData: LiveData<HomeResponse?> = _homeData

    private val _error = MutableLiveData<String>()
    val error: LiveData<String> = _error

    fun fetchInitialData() {
        viewModelScope.launch {
            try {
                // 1. Fetch Config if not loaded
                if (ConfigManager.config == null) {
                    try {
                        val configResponse = ApiClient.apiService.getAppConfig()
                        if (configResponse.isSuccessful && configResponse.body() != null) {
                            ConfigManager.config = configResponse.body()
                        }
                    } catch (_: Exception) {}
                }

                // 2. Try fetching from blast home proxy first
                val blastHomeResponse = ApiClient.apiService.getBlastHome()
                if (blastHomeResponse.isSuccessful && blastHomeResponse.body() != null) {
                    _homeData.postValue(blastHomeResponse.body())
                    return@launch
                }

                // 3. Fallback to dynamic URL
                val dynamicHomeUrl = ConfigManager.getHomeUrl()
                val homeResponse = ApiClient.apiService.getHome(dynamicHomeUrl)
                if (homeResponse.isSuccessful && homeResponse.body() != null) {
                    _homeData.postValue(homeResponse.body())
                } else {
                    _error.postValue("Failed to load home data. Code: ${homeResponse.code()}")
                }

            } catch (e: Exception) {
                _error.postValue(e.localizedMessage ?: "Network error. Check internet connection.")
            }
        }
    }
}