import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
}

// Release key, same as the Capacitor app: frontend-vite/android/keystore.properties (git-ignored; format in
// keystore.properties.example). -PcapynimeKeystoreProperties=<file> points elsewhere (another checkout);
// CI passes CAPYNIME_KEYSTORE + passwords as environment variables instead.
val keystoreProps = Properties()
val keystorePropsFile = providers.gradleProperty("capynimeKeystoreProperties").orNull?.let(::File)
    ?: rootProject.file("../frontend-vite/android/keystore.properties")
if (keystorePropsFile.isFile) keystorePropsFile.inputStream().use(keystoreProps::load)
val releaseStorePath = providers.environmentVariable("CAPYNIME_KEYSTORE").orNull
    ?: keystoreProps.getProperty("storeFile")?.let { File(keystorePropsFile.parentFile, it).path }
fun secret(env: String, key: String): String =
    providers.environmentVariable(env).orNull ?: keystoreProps.getProperty(key) ?: error("Missing $env / $key for release signing")

android {
    namespace = "app.capynime.compose"
    compileSdk = 37

    defaultConfig {
        // its own id: installs next to the Capacitor app (app.capynime)
        applicationId = "app.capynime.compose"
        minSdk = 26
        targetSdk = 36
        versionCode = providers.gradleProperty("nativeVersionCode").orNull?.toInt() ?: 3
        versionName = providers.gradleProperty("nativeVersionName").orNull ?: "1.2.0"
        buildConfigField("String", "GITHUB_REPO", "\"CodeForFee/anime-cinema-vite\"")
        buildConfigField("String", "GITHUB_APK_ASSET", "\"Capynime-native-release.apk\"")
    }

    signingConfigs {
        if (releaseStorePath != null) create("nativeRelease") {
            storeFile = file(releaseStorePath)
            storePassword = secret("CAPYNIME_STORE_PASSWORD", "storePassword")
            keyAlias = secret("CAPYNIME_KEY_ALIAS", "keyAlias")
            keyPassword = secret("CAPYNIME_KEY_PASSWORD", "keyPassword")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            // No key configured: a debug-signed build still works locally, but the updater and Android refuse to
            // install it over a release-signed app, so never publish one.
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
