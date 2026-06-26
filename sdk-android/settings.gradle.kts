pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.PREFER_SETTINGS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "pingit-sdk"

// The pure-Kotlin core is an included build; its `com.pingit:pingit-core`
// coordinates are substituted automatically into the :android module.
includeBuild("core")

include(":android", ":sample")
