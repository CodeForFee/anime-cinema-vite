plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
}

val releaseStorePath = providers.environmentVariable("CAPYNIME_KEYSTORE").orNull

android {
    namespace = "app.capynime.compose"
    compileSdk = 37

    defaultConfig {
        // its own id: installs next to the Capacitor app (app.capynime)
        applicationId = "app.capynime.compose"
        minSdk = 26
        targetSdk = 36
        versionCode = providers.gradleProperty("nativeVersionCode").orNull?.toInt() ?: 2
        versionName = providers.gradleProperty("nativeVersionName").orNull ?: "1.1.0"
        buildConfigField("String", "GITHUB_REPO", "\"CodeForFee/anime-cinema-vite\"")
        buildConfigField("String", "GITHUB_APK_ASSET", "\"Capynime-native-release.apk\"")
    }

    signingConfigs {
        if (releaseStorePath != null) create("nativeRelease") {
            storeFile = file(releaseStorePath)
            storePassword = providers.environmentVariable("CAPYNIME_STORE_PASSWORD").get()
            keyAlias = providers.environmentVariable("CAPYNIME_KEY_ALIAS").get()
            keyPassword = providers.environmentVariable("CAPYNIME_KEY_PASSWORD").get()
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            // Local sideloads preserve the existing test app's signer; CI must supply the same release key.
            signingConfig = signingConfigs.getByName(if (releaseStorePath != null) "nativeRelease" else "debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    lint {
        disable += "UseKtx"
        abortOnError = false
    }

    packaging {
        resources.excludes += "/META-INF/{AL2.0,LGPL2.1}"
    }
}

dependencies {
    implementation(libs.media3.exoplayer)
    implementation(libs.media3.hls)
    implementation(libs.media3.ui)
    implementation(libs.media3.okhttp)
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20250517")

    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.foundation)
    implementation(libs.compose.material3)
    implementation(libs.compose.material.icons.extended)
    implementation(libs.lucide)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.androidx.webkit)
    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.kyant.backdrop)
    implementation(libs.kyant.shapes)
    implementation(libs.okhttp)
    implementation(libs.jsoup)
    implementation(libs.coil.compose)
    implementation(libs.coil.network.okhttp)
}
