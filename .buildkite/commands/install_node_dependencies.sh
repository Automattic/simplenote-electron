#!/bin/bash -eu

echo "--- :npm: Install Node dependencies"
# --legacy-peer-deps is necessary because of react-monaco-editor.
# See README for more details
#
# A note on --force: Using it as an experiment to see if the macOS build works.
# The flag is used in CircleCI, but lint and test worked on macOS without it.
# See https://buildkite.com/automattic/simplenote-electron/builds/13#018fc75d-ed95-4c02-aaa7-a343a0a1d38a
npm ci --legacy-peer-deps --force
