#!/bin/bash -eu

echo "--- :npm: Install Node dependencies"
# --legacy-peer-deps is necessary because of react-monaco-editor.
# See README for more details
npm ci --legacy-peer-deps
