# PingIt Android SDK (`pingit-sdk`)

An Android SDK for measuring internet quality and evaluating whether the current
connection is "ready" for a given usage profile (video call, 4K streaming,
cloud gaming, …).

## Modules

- **`core/`** — included build `com.pingit:pingit-core`. Pure-Kotlin, all logic,
  fully unit-tested on a plain JDK. See `core/README.md`.
- **`:android`** — `com.android.library` (namespace `com.pingit.android`). The
  Android adapters: OkHttp transport, connectivity, DataStore-backed stores,
  crash handler, lifecycle flush, and `WorkManager` upload worker, plus the
  public `com.pingit.PingIt` facade.
- **`:sample`** — `com.android.application` demo app.

## Requirements

- Android Studio (Giraffe+), Android Gradle Plugin 8.5.0, Kotlin 1.9.24.
- Gradle wrapper 8.7, JDK 17.
- `minSdk 24`, `compileSdk 34`.

## Opening / building

1. Open `sdk-android/` in Android Studio.
2. Create `local.properties` at the repo root pointing at your Android SDK:

   ```properties
   sdk.dir=/Users/you/Library/Android/sdk
   ```

3. Build the sample:

   ```bash
   ./gradlew :sample:assembleDebug
   ```

The `core` module is consumed via `includeBuild("core")`; its
`com.pingit:pingit-core:0.1.0` coordinates are substituted automatically.

> The `core` unit tests run without the Android SDK:
> `cd core && JAVA_HOME=/opt/homebrew/opt/openjdk@17 ./gradlew test`.

## Usage

```kotlin
val client = PingIt.init(
    appId = "your-app",
    config = Config(
        historyMode = HistoryMode.SERVER_HISTORY,
        endpoint = "https://your-host:port",
    ),
    context = applicationContext,
)

val readiness = client.isReadyFor(Profile.VIDEO_CALL) // suspend
val result = client.runTest()                          // suspend
val history = client.getHistory(limit = 20)            // suspend
client.cancel()                                        // abort in-flight work
```

## Server contract

Endpoints are relative to the configured base URL:

| Method | Path                                  | Purpose                       |
|--------|---------------------------------------|-------------------------------|
| GET    | `/download?bytes=N`                   | stream N bytes (download)     |
| POST   | `/upload`                             | accept body (upload)          |
| GET    | `/ping`                               | latency probe                 |
| GET    | `/profiles`                           | `ProfilesResponseDto` JSON    |
| POST   | `/results`                            | `ResultDto` JSON              |
| GET    | `/results?appId&deviceId&limit`       | list of `ResultDto`           |
| GET    | `/health`                             | health probe (fallback logic) |
| POST   | `/crashes`                            | crash report                  |
