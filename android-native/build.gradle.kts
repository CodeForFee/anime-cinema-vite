plugins {
    alias(libs.plugins.android.application) apply false
    // Pins the Kotlin Gradle plugin used by AGP 9's built-in Kotlin to the same version.
    alias(libs.plugins.kotlin.jvm) apply false
    alias(libs.plugins.kotlin.compose) apply false
}
