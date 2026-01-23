package com.devheadllc.risingpunk

import com.devheadllc.risingpunk.BuildConfig
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class BuildInfoModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    override fun getName(): String {
        return "BuildInfo"
    }
    
    @ReactMethod
    fun getVersionCode(promise: Promise) {
        try {
            val versionCode = BuildConfig.VERSION_CODE
            promise.resolve(versionCode)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to get version code", e)
        }
    }
    
    @ReactMethod
    fun getVersionName(promise: Promise) {
        try {
            val versionName = BuildConfig.VERSION_NAME
            promise.resolve(versionName)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to get version name", e)
        }
    }
    
    @ReactMethod
    fun getBuildInfo(promise: Promise) {
        try {
            val buildInfo = com.facebook.react.bridge.WritableNativeMap().apply {
                putInt("versionCode", BuildConfig.VERSION_CODE)
                putString("versionName", BuildConfig.VERSION_NAME)
                putBoolean("debug", BuildConfig.DEBUG)
            }
            promise.resolve(buildInfo)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to get build info", e)
        }
    }
}
