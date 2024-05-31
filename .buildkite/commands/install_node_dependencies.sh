#!/bin/bash -eu

echo "--- :npm: Install Node dependencies"
# --legacy-peer-deps is necessary because of react-monaco-editor.
# See README for more details
#
# --include=optional is an attempt to fix the missing dmg-license which we are seeing in Buildkite
# See https://buildkite.com/automattic/simplenote-electron/builds/40#018fcd52-a38f-4a75-9ee3-474384ccdee7
npm ci --legacy-peer-deps --include=optional
