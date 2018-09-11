ifeq ($(OS),Windows_NT)
	FILE_PATH_SEP := \
	IS_WINDOWS := true
else
	FILE_PATH_SEP := /
	IS_WINDOWS := false
endif

/ = $(FILE_PATH_SEP)

THIS_MAKEFILE_PATH := $(word $(words $(MAKEFILE_LIST)),$(MAKEFILE_LIST))
THIS_DIR := $(shell cd $(dir $(THIS_MAKEFILE_PATH));pwd)

NPM ?= $(NODE) $(shell which npm)
NPM_BIN = $(shell npm bin)

RED=`tput setaf 1`
RESET=`tput sgr0`

SIMPLENOTE_JS := $(THIS_DIR)/dist/app.js
SIMPLENOTE_CHANGES_STD := `find "$(THIS_DIR)" -newer "$(SIMPLENOTE_JS)" \( -name "*.js" -o -name "*.jsx" -o -name "*.json" -o -name "*.scss" \) -type f -print -quit | grep -v .min. | wc -l`
SIMPLENOTE_BRANCH = $(shell git --git-dir .git branch | sed -n -e 's/^\* \(.*\)/\1/p')


# Build configurations
NODE_ENV = production
# Defines if we should compile web app via `build` target
SKIP_BUILD = false


# Main targets
.PHONY: start
start: rebuild-deps
	@NODE_ENV=$(NODE_ENV) npx electron .

.PHONY: dev
dev: NODE_ENV = development
dev:
	@$(MAKE) build NODE_ENV=$(NODE_ENV)

	@NODE_ENV=$(NODE_ENV) npx webpack-dev-server --config ./webpack.config.js --content-base dist --host 0.0.0.0 --port 4000 --hot --inline

.PHONY: test
test: 
	@npx jest


# Build web app
.PHONY: build
build:
ifeq ($(SKIP_BUILD),false)
	@echo "Building Simplenote Desktop on branch $(RED)$(SIMPLENOTE_BRANCH)$(RESET)"
ifeq ($(NODE_ENV),production)
	$(eval IS_PRODUCTION = true)
endif

	@$(MAKE) build-dll build-app IS_PRODUCTION=$(IS_PRODUCTION)
endif


# Build utils
.PHONY: build-app
build-app: 
	@npx webpack $(if $(IS_PRODUCTION),-p) --config ./webpack.config.js

.PHONY: build-dll
build-dll: 
	@npx webpack $(if $(IS_PRODUCTION),-p) --config ./webpack.config.dll.js

.PHONY: build-if-not-exists 
build-if-not-exists: config.json
	@if [ -f $(SIMPLENOTE_JS) ]; then true; else make build; fi

.PHONY: build-if-changed 
build-if-changed: build-if-not-exists
	@if [ $(SIMPLENOTE_CHANGES_STD) -eq 0 ]; then true; else make build; fi;


# Build binaries only
.PHONY: osx 
osx: config-release build-if-changed
	@npx electron-builder -m --dir

.PHONY: linux 
linux: config-release build-if-changed
	@npx electron-builder -l --dir

.PHONY: win32 
win32: config-release build-if-changed
	@npx electron-builder --win --dir


# Build installers 
.PHONY: package 
package: build-if-changed

.PHONY: package-win32 
package-win32: build-if-changed
ifeq (IS_WINDOWS,true)
	@npx electron-builder --win --config=./electron-builder-appx.json
else
	@npx electron-builder --win
endif

.PHONY: package-osx 
package-osx: build-if-changed
	@npx electron-builder --mac

.PHONY: package-linux
package-linux: build-if-changed
	@npx electron-builder --linux


# NPM
.PHONY: 
install: node_modules

node_modules/%:
	@npm install $(notdir $@)

node_modules: package.json
	@npm prune
	@npm install
	@touch node_modules


# Checks
config.json:
ifeq (,$(wildcard $(THIS_DIR)$/config.json))
	$(error config.json not found. Required file, see docs)
endif


# Utils 
.PHONY: config-release
config-release: config.json install

.PHONY: rebuild-deps
rebuild-deps:
	@npx electron-rebuild

.PHONY: format
format:
	@npx prettier --write {desktop,lib,sass}/{**/,*}.{js,json,jsx,sass}

.PHONY: lint
lint:
	@npx eslint --ext .js --ext .jsx lib