# Building the Android app

Open Herbology ships as an Android app via **Capacitor** — the Next.js static
export (`out/`) is bundled as local assets inside a WebView shell. The app runs
fully offline; there is no dependency on the GitHub Pages site.

This is a **private, sideloaded** build (debug-signed). Not on the Play Store.

## One command

```powershell
npm run apk:debug
```

Runs `tools/build-apk.ps1`: `next build` → `cap sync android` → `gradlew assembleDebug`,
then copies the result to **`build/open-herbology-debug.apk`** (~32 MB).

Install it by transferring the `.apk` to the phone and opening it (enable
"install unknown apps" for your file manager / browser when prompted).

## Toolchain

Same machine layout as the Godot game (see the `android-build-toolchain` memory);
paths are off C: because of disk constraints.

| Piece | Location | Notes |
| --- | --- | --- |
| JDK 21 | `E:\toolchain\jdk21` | Capacitor 7's android library compiles against Java 21. **Not** the JDK 17 (Godot) or system JDK 25. |
| Android SDK | `E:\toolchain\android-sdk` | `platforms;android-35`, `build-tools;35.0.0` — matches Capacitor 7 (`compileSdk`/`targetSdk` 35). |
| Gradle | wrapper (`android/gradlew`), 8.11.1 | `distributionUrl` points at the Tencent mirror; the services.gradle.org CDN stalls mid-download from here. Cache: `D:\gradle`. |
| SDK path | `android/local.properties` | `sdk.dir=E:\\toolchain\\android-sdk` — machine-specific, gitignored. |

`build-apk.ps1` sets `JAVA_HOME`, `ANDROID_HOME`, and `GRADLE_USER_HOME=D:\gradle`
for the build; nothing needs to be on `PATH` globally.

## Config

- `capacitor.config.ts` — appId `com.sevenelevenshao.openherbology`, `webDir: "out"`.
- `assets/*.svg` — icon and splash sources (leaf mark, cream / OLED-black). Regenerate
  the Android resources with `npm run cap:assets` after editing.
- `android/app/src/main/res/values/styles.xml` — black system bars; opts out of
  Android 15 forced edge-to-edge so the web UI's sticky top bar is not clipped.
- The service worker is skipped inside Capacitor (`"Capacitor" in window`) — assets
  are already local and a SW there only risks pinning stale content across updates.

## After changing the web app

`npm run cap:sync` (build + copy into the native project), then `npm run apk:debug`.
The `android/` folder is committed; regenerated parts (`app/build/`, `local.properties`,
copied web assets) are gitignored.

## Release signing (not set up)

The debug key rotates per machine/user, so a debug APK from a different build may
not install over an existing one. If a stable identity is wanted later: create a
keystore, add `signingConfigs.release` + `buildTypes.release` to
`android/app/build.gradle`, and build `assembleRelease`.
