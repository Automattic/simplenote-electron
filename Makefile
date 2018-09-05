ifeq ($(OS),Windows_NT)
	FILE_PATH_SEP := \
# leave this line here. make is make... ¯\_(ツ)_/¯
else
	FILE_PATH_SEP := /
# leave this line here. make is make... ¯\_(ツ)_/¯
endif

/ = $(FILE_PATH_SEP)

THIS_MAKEFILE_PATH := $(word $(words $(MAKEFILE_LIST)),$(MAKEFILE_LIST))
THIS_DIR := $(shell cd $(dir $(THIS_MAKEFILE_PATH));pwd)

NPM ?= $(NODE) $(shell which npm)
NPM_BIN = $(shell npm bin)

RED=`tput setaf 1`
RESET=`tput sgr0`

START_APP := @$(NPM_BIN)/electron .
ELECTRON_TEST := ELECTRON_PATH=$(NPM_BIN)/electron $(NPM_BIN)/electron-mocha
CONFIG := $(THIS_DIR)/config.json
DESKTOP_BUILD_DIR := $(THIS_DIR)/desktop-build
BUILDER := $(THIS_DIR)/builder.js
BUILD_CONFIG := $(THIS_DIR)/resources/build-scripts/build-config-file.js
PACKAGE_DMG := $(THIS_DIR)/resources/build-scripts/package-dmg.js
PACKAGE_WIN32 := @$(NPM_BIN)/electron-builder
CERT_SPC := $(THIS_DIR)/resources/secrets/automattic-code.spc
CERT_PVK := $(THIS_DIR)/resources/secrets/automattic-code.pvk
SIMPLENOTE_JS := $(THIS_DIR)/dist/app.js
SIMPLENOTE_CHANGES_STD := `find "$(THIS_DIR)" -newer "$(SIMPLENOTE_JS)" \( -name "*.js" -o -name "*.jsx" -o -name "*.json" -o -name "*.scss" \) -type f -print -quit | grep -v .min. | wc -l`
SIMPLENOTE_BRANCH = $(shell git --git-dir .git branch | sed -n -e 's/^\* \(.*\)/\1/p')

SKIP_BUILD = false

# check for config
config.json:
ifeq (,$(wildcard $(THIS_DIR)$/config.json))
	$(error config.json not found. Required file, see docs)
endif

# Builds Calypso (desktop)
build:
ifeq ($(SKIP_BUILD),false)
	@echo building...
	@echo "Building Simplenote Desktop on branch $(RED)$(SIMPLENOTE_BRANCH)$(RESET)"
	NODE_ENV=production npx webpack -p --config webpack.config.dll.js && npx webpack -p --config webpack.config.js
endif

build-if-not-exists: config.json
	@if [ -f $(SIMPLENOTE_JS) ]; then true; else make build; fi

build-if-changed: build-if-not-exists
	@if [ $(SIMPLENOTE_CHANGES_STD) -eq 0 ]; then true; else make build; fi;

# Build packages
osx: config-release
	@node $(BUILDER) darwin

linux: config-release
	@node $(BUILDER) linux

win32: config-release
	@node $(BUILDER) win32

# Packagers
package: build-if-changed
# @rm -rf $(DESKTOP_BUILD_DIR)/node_modules $(DESKTOP_BUILD_DIR)/desktop $(DESKTOP_BUILD_DIR)/dist
# @mkdir -p $(DESKTOP_BUILD_DIR)
# @cp -rf $(THIS_DIR)/package.json $(DESKTOP_BUILD_DIR)
# @cp -R $(THIS_DIR)/node_modules $(DESKTOP_BUILD_DIR)
# @cp -R $(THIS_DIR)/desktop $(DESKTOP_BUILD_DIR)
# @cp -R $(THIS_DIR)/dist $(DESKTOP_BUILD_DIR)

package-win32: build-if-changed
	@npx electron-builder --win
# @$(PACKAGE_WIN32) ./release/Simplenote-win32-ia32 --win --ia32 --config=./resources/build-config/win32.json
# @node $(THIS_DIR)/resources/build-scripts/rename-with-version-win.js
# @node $(THIS_DIR)/resources/build-scripts/code-sign-win.js --spc=$(CERT_SPC) --pvk=$(CERT_PVK)

package-osx: build-if-changed
	@npx electron-builder --mac
# @node $(PACKAGE_DMG)
# @ditto -c -k --sequesterRsrc --keepParent --zlibCompressionLevel 9 ./release/Simplenote-darwin-x64/Simplenote.app ./release/Simplenote.app.zip
# @node $(THIS_DIR)/resources/build-scripts/rename-with-version-osx.js

package-linux: build-if-changed
	@npx electron-builder --linux

config-release: config.json install

# NPM
install: node_modules

node_modules/%:
	@npm install $(notdir $@)

node_modules: package.json
	@npm prune
	@npm install
	@touch node_modules
