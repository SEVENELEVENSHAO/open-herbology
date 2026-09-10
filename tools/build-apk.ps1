# Build the Open Herbology debug APK.
#
#   powershell -ExecutionPolicy Bypass -File tools/build-apk.ps1
#   npm run apk:debug
#
# Rebuilds the Next.js static export, syncs it into the Capacitor Android
# project, and assembles a debug APK -> build/open-herbology-debug.apk
#
# Toolchain (see memory: android-build-toolchain) lives off C: because of disk
# layout: JDK 17 and the Android SDK on E:, Gradle caches on D:.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# Capacitor 7's android library compiles against Java 21, so JDK 21 (not the
# JDK 17 used for the Godot game, nor the system JDK 25).
$env:JAVA_HOME         = "E:\toolchain\jdk21"
$env:ANDROID_HOME      = "E:\toolchain\android-sdk"
$env:ANDROID_SDK_ROOT  = "E:\toolchain\android-sdk"
$env:GRADLE_USER_HOME  = "D:\gradle"
$env:PATH              = "$env:JAVA_HOME\bin;$env:PATH"

Write-Host "==> next build (static export)" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw "next build failed" }

Write-Host "==> cap sync android" -ForegroundColor Cyan
npx cap sync android
if ($LASTEXITCODE -ne 0) { throw "cap sync failed" }

Write-Host "==> gradle assembleDebug" -ForegroundColor Cyan
Push-Location android
try {
  & .\gradlew.bat :app:assembleDebug --no-daemon --console=plain
  if ($LASTEXITCODE -ne 0) { throw "gradle assembleDebug failed" }
} finally {
  Pop-Location
}

$apk = "android\app\build\outputs\apk\debug\app-debug.apk"
if (-not (Test-Path $apk)) { throw "APK not found at $apk" }

New-Item -ItemType Directory -Force -Path "build" | Out-Null
$out = "build\open-herbology-debug.apk"
Copy-Item $apk $out -Force

$size = [math]::Round((Get-Item $out).Length / 1MB, 1)
Write-Host ""
Write-Host "APK ready: $out  ($size MB)" -ForegroundColor Green
