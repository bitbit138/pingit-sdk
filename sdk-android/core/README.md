# pingit-core

Pure-Kotlin (JVM) core of the PingIt Android SDK. Contains all measurement,
scoring, evaluation, profile-resolution and history logic with **no Android
dependencies**, so it can be unit-tested on a plain JDK.

## Building / testing (JDK only)

This module builds with the Gradle wrapper using **JDK 17**. The default `java`
on this machine may be a newer JDK that Gradle 8.7 does not support, so always
point `JAVA_HOME` at JDK 17:

```bash
cd core
JAVA_HOME=/opt/homebrew/opt/openjdk@17 ./gradlew test
```

(For a non-wrapper invocation, also prepend
`PATH=/opt/homebrew/opt/openjdk@17/bin:$PATH`.)

## Layout

- `model/` — domain types (`Profile`, `Range`, `Requires`, `ProfileTable`,
  `Config`, `TestResult`, `ReadinessResult`, `HistoryMode`).
- `measure/` — `Jitter`, `Throughput`, `DataSaverPlan`, `MeasurementService`.
- `score/` — weighted 0..100 `Score` + labels.
- `eval/` — `Evaluator` (requirement checks) and `ReadinessService`.
- `profiles/` — `BundledProfiles` (loads `/profiles.json`), `ProfileCache`,
  `ProfileResolver` (network → cache → bundled).
- `json/` — `@Serializable` DTOs + DTO↔model mappers matching the server.
- `history/` — `HistoryPolicy`.
- `fallback/` — `Target` + `TargetSelector`.
- `io/` — platform interfaces (`Clock`, `Rng`, `HttpClient`, `Connectivity`,
  stores, `Outbox`, `CrashSink`, …) implemented by the `:android` module.
- `PingItCore.kt` — orchestrator wired entirely from the `io` interfaces.

`src/main/resources/profiles.json` is the bundled fallback profile table.
