plugins {
    id("com.android.application")
    kotlin("android")
}

android {
    namespace = "com.pingit.sample"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.pingit.sample"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "0.1.0"
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
    implementation(project(":android"))
    implementation("com.pingit:pingit-core:0.1.0")

    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.2")
}
