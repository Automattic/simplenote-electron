#!/bin/bash -eu

# --legacy-peer-deps is necessary because of react-monaco-editor.
# See README for more details
install_npm_packages_clean --legacy-peer-deps
