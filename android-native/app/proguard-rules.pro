# Jsoup ships optional re2j support it never needs here
-dontwarn com.google.re2j.**
# OkHttp's optional TLS providers
-dontwarn org.bouncycastle.**
-dontwarn org.conscrypt.**
-dontwarn org.openjsse.**
# The player page talks to the app through this object (WebMessageListener), not by reflection; kept anyway
-keep class app.capynime.compose.player.** { *; }

# Names kept (shrinking and optimising still run): the baseline profile in src/main/baseline-prof.txt is
# recorded on a device from this build and must name the same classes as the code
-dontobfuscate
