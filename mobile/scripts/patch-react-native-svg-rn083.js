/**
 * Post-install script: patch react-native-svg native code for RN 0.83 compatibility.
 * RN 0.83 deprecates SharedImageManager in favor of std::shared_ptr<ImageManager>;
 * the Android build uses -Werror so deprecation becomes a compile error.
 * This script replaces SharedImageManager with std::shared_ptr<ImageManager> in the
 * affected C++ files. No extra dependencies — uses Node built-in fs only.
 */
const fs = require('fs');
const path = require('path');

const rnSvgRoot = path.join(__dirname, '..', 'node_modules', 'react-native-svg');
const replacement = 'std::shared_ptr<ImageManager>';
const search = /SharedImageManager/g;

const files = [
  'common/cpp/react/renderer/components/rnsvg/RNSVGImageShadowNode.h',
  'common/cpp/react/renderer/components/rnsvg/RNSVGImageComponentDescriptor.h',
  'common/cpp/react/renderer/components/rnsvg/RNSVGImageShadowNode.cpp',
];

if (!fs.existsSync(path.join(rnSvgRoot, files[0]))) {
  console.warn('patch-react-native-svg-rn083: react-native-svg not found or structure changed, skipping');
  process.exit(0);
}

let patched = 0;
for (const rel of files) {
  const filePath = path.join(rnSvgRoot, rel);
  if (!fs.existsSync(filePath)) continue;
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('SharedImageManager')) continue;
  content = content.replace(search, replacement);
  fs.writeFileSync(filePath, content);
  patched++;
}

if (patched > 0) {
  console.log('patch-react-native-svg-rn083: Replaced SharedImageManager with std::shared_ptr<ImageManager> in', patched, 'file(s) for RN 0.83');
}
