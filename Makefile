THIS_MAKEFILE_PATH := $(word $(words $(MAKEFILE_LIST)),$(MAKEFILE_LIST))
THIS_DIR := $(shell cd $(dir $(THIS_MAKEFILE_PATH));pwd)

NPM ?= $(NODE) $(shell which npm)
NPM_BIN = $(shell npm bin)

RED=`tput setaf 1`
RESET=`tput sgr0`

START_APP := @$(NPM_BIN)/electron .
ELECTRON_TEST := ELECTRON_PATH=$(NPM_BIN)/electron $(NPM_BIN)/electron-mocha
CONFIG := $(THIS_DIR)/config.json
BUILDER := $(THIS_DIR)/builder.js
BUILD_CONFIG := $(THIS_DIR)/resources/build-scripts/build-config-file.js
PACKAGE_DMG := $(THIS_DIR)/resources/build-scripts/package-dmg.js
PACKAGE_WIN32 := @$(NPM_BIN)/electron-builder
CERT_SPC := $(THIS_DIR)/resources/secrets/automattic-code.spc
CERT_PVK := $(THIS_DIR)/resources/secrets/automattic-code.pvk
SIMPLENOTE_JS := $(THIS_DIR)/dist/app.js
SIMPLENOTE_CHANGES_STD := `find "$(THIS_DIR)" -newer "$(SIMPLENOTE_JS)" \( -name "*.js" -o -name "*.jsx" -o -name "*.json" -o -name "*.scss" \) -type f -print -quit | grep -v .min. | wc -l`
SIMPLENOTE_BRANCH = $(shell git --git-dir .git branch | sed -n -e 's/^\* \(.*\)/\1/p')

# check for config
config:
	@test -s $(THIS_DIR)/config.js || { echo "config.js not found. Required file, see docs"; exit 1; }

# Builds Calypso (desktop)
build: install
	@echo "Building Simplenote Desktop on branch $(RED)$(SIMPLENOTE_BRANCH)$(RESET)"
	@$(NPM) run build:prod

build-if-not-exists:
	@if [ -f $(SIMPLENOTE_JS) ]; then true; else make build; fi

build-if-changed: build-if-not-exists
	@if [ $(SIMPLENOTE_CHANGES_STD) -eq 0 ]; then true; else make build; fi;

# Build packages
osx: config-release build-if-changed
	@node $(BUILDER) darwin

linux: config-release build-if-changed
	@node $(BUILDER) linux

win32: config-release build-if-changed
	@node $(BUILDER) win32

# Packagers
package-win32: win32
	@$(PACKAGE_WIN32) ./release/Simplenote-win32-ia32 --platform=win --out=./release --config=./resources/build-config/win32.json
	@node $(THIS_DIR)/resources/build-scripts/rename-with-version-win.js
	@node $(THIS_DIR)/resources/build-scripts/code-sign-win.js --spc=$(CERT_SPC) --pvk=$(CERT_PVK)

package-osx: osx
	@node $(PACKAGE_DMG)
	@ditto -c -k --sequesterRsrc --keepParent --zlibCompressionLevel 9 ./release/Simplenote-darwin-x64/Simplenote.app ./release/Simplenote.app.zip
	@node $(THIS_DIR)/resources/build-scripts/rename-with-version-osx.js

package-linux: linux
	@node $(THIS_DIR)/resources/build-scripts/package-linux.js

config-release: config install

# NPM
install: node_modules

node_modules/%:
	@$(NPM) install $(notdir $@)

node_modules: package.json
	@$(NPM) prune
	@$(NPM) install
	@touch node_modules
