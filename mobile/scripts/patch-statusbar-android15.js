/**
 * Post-install script: patch React Native StatusBarModule to avoid deprecated
 * getStatusBarColor/setStatusBarColor on Android 15+ (API 35) for Play Console.
 * No extra dependencies — uses Node built-in fs only.
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native',
  'ReactAndroid',
  'src',
  'main',
  'java',
  'com',
  'facebook',
  'react',
  'modules',
  'statusbar',
  'StatusBarModule.kt'
);

const SENTINEL = 'Android 15+ (API 35): getStatusBarColor';

const GET_CONSTANTS_ORIGINAL = `  @Suppress("DEPRECATION")
  override fun getTypedExportedConstants(): Map<String, Any> {
    val statusBarColor =
        currentActivity?.window?.statusBarColor?.let { color ->
          String.format("#%06X", 0xFFFFFF and color)
        } ?: "black"
    return mapOf(`;

const GET_CONSTANTS_PATCHED = `  @Suppress("DEPRECATION")
  override fun getTypedExportedConstants(): Map<String, Any> {
    // Android 15+ (API 35): getStatusBarColor/setStatusBarColor are deprecated for edge-to-edge.
    // Return default without reading window.statusBarColor to satisfy Play Console.
    val statusBarColor =
        if (Build.VERSION.SDK_INT >= 35) {
          "black"
        } else {
          currentActivity?.window?.statusBarColor?.let { color ->
            String.format("#%06X", 0xFFFFFF and color)
          } ?: "black"
        }
    return mapOf(`;

const SET_COLOR_ORIGINAL = `  @Suppress("DEPRECATION")
  override fun setColor(colorDouble: Double, animated: Boolean) {
    val color = colorDouble.toInt()`;

const SET_COLOR_PATCHED = `  @Suppress("DEPRECATION")
  override fun setColor(colorDouble: Double, animated: Boolean) {
    // Android 15+ (API 35): setStatusBarColor/getStatusBarColor are deprecated for edge-to-edge.
    // No-op on API 35+ to satisfy Play Console; status bar is transparent in edge-to-edge.
    if (Build.VERSION.SDK_INT >= 35) return
    val color = colorDouble.toInt()`;

if (!fs.existsSync(filePath)) {
  console.warn('patch-statusbar-android15: StatusBarModule.kt not found, skipping (react-native not installed?)');
  process.exit(0);
}

let content = fs.readFileSync(filePath, 'utf8');

if (content.includes(SENTINEL)) {
  process.exit(0);
}

if (!content.includes(GET_CONSTANTS_ORIGINAL) || !content.includes(SET_COLOR_ORIGINAL)) {
  console.warn('patch-statusbar-android15: StatusBarModule.kt format unexpected, skipping');
  process.exit(0);
}

content = content.replace(GET_CONSTANTS_ORIGINAL, GET_CONSTANTS_PATCHED);
content = content.replace(SET_COLOR_ORIGINAL, SET_COLOR_PATCHED);

fs.writeFileSync(filePath, content);
console.log('patch-statusbar-android15: Patched StatusBarModule.kt for Android 15 (no getStatusBarColor/setStatusBarColor on API 35+)');
