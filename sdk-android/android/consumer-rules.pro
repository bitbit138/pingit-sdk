# Keep serializable DTOs and generated serializers from the core module.
-keepclassmembers class com.pingit.core.json.** {
    *** Companion;
}
-keepclasseswithmembers class com.pingit.core.json.** {
    kotlinx.serialization.KSerializer serializer(...);
}
