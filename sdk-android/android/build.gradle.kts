plugins {
    id("com.android.library")
    kotlin("android")
    kotlin("plugin.serialization")
}

android {
    namespace = "com.pingit.android"
    compileSdk = 34

    defaultConfig {
        minSdk = 24
        consumerProguardFiles("consumer-rules.pro")
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }
}

kotlin {
    sourceSets.all {
        kotlin.srcDir("src/main/kotlin")
    }
}

dependencies {
    // Resolved from the included build `core` via dependency substitution.
    implementation("com.pingit:pingit-core:0.1.0")

    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.3")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("androidx.work:work-runtime-ktx:2.9.0")
    implementation("androidx.lifecycle:lifecycle-process:2.8.2")
    implementation("androidx.datastore:datastore-preferences:1.1.1")
    // App Startup powers zero-touch SDK initialization (see PingItInitializer).
    implementation("androidx.startup:startup-runtime:1.1.1")
}
