#!/usr/bin/env node
// lessel meta-package entry — delegates to @lessel/cli if available,
// otherwise falls back to local path for development installs.
try {
  require('@lessel/cli/dist/index.js');
} catch {
  require('../packages/cli/dist/index.js');
}