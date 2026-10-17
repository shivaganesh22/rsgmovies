package com.rsg.movies

import android.app.Application
import com.rsg.movies.data.api.ApiClient

class RSGApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        ApiClient.init(this)
    }
}
