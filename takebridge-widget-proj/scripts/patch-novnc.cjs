#!/usr/bin/env node

/**
 * Patch @novnc/novnc to fix top-level await issue
 * This script wraps the top-level await in an async IIFE
 */

const fs = require('fs');
const path = require('path');

const browserJsPath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@novnc',
  'novnc',
  'lib',
  'util',
  'browser.js'
);

if (!fs.existsSync(browserJsPath)) {
  console.log('[patch-novnc] browser.js not found, skipping patch');
  process.exit(0);
}

let content = fs.readFileSync(browserJsPath, 'utf8');

// Check if already patched
if (content.includes('// PATCHED: top-level await wrapped')) {
  console.log('[patch-novnc] Already patched, skipping');
  process.exit(0);
}

// Find the top-level await line and wrap it
// Pattern: exports.supportsWebCodecsH264Decode = supportsWebCodecsH264Decode = await _checkWebCodecsH264DecodeSupport();
const awaitPattern = /exports\.supportsWebCodecsH264Decode\s*=\s*supportsWebCodecsH264Decode\s*=\s*await\s+_checkWebCodecsH264DecodeSupport\(\);/;

if (awaitPattern.test(content)) {
  console.log('[patch-novnc] Patching top-level await...');
  
  // Replace with wrapped version
  content = content.replace(
    awaitPattern,
    `// PATCHED: top-level await wrapped in async IIFE
(async () => {
  try {
    exports.supportsWebCodecsH264Decode = supportsWebCodecsH264Decode = await _checkWebCodecsH264DecodeSupport();
  } catch (e) {
    exports.supportsWebCodecsH264Decode = supportsWebCodecsH264Decode = false;
  }
})();`
  );
  
  fs.writeFileSync(browserJsPath, content, 'utf8');
  console.log('[patch-novnc] Patch applied successfully');
} else {
  console.log('[patch-novnc] Top-level await pattern not found, file may have changed');
}

