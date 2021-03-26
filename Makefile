ifeq ($(OS),Windows_NT)
	FILE_PATH_SEP := \\
	IS_WINDOWS := true
else
	FILE_PATH_SEP := /
endif

/ = $(FILE_PATH_SEP)

THIS_MAKEFILE_PATH := $(word $(words $(MAKEFILE_LIST)),$(MAKEFILE_LIST))
THIS_DIR := $(shell cd $(dir $(THIS_MAKEFILE_PATH));pwd)

NPM ?= $(NODE) $(shell which npm)
NPM_BIN = $(shell npm bin)

ELECTRON_VERSION := $(shell node -e "console.log(require('./package.json').devDependencies.electron)")

RED=`tput setaf 1`
RESET=`tput sgr0`

SIMPLENOTE_JS := $(THIS_DIR)/dist/app.js
SIMPLENOTE_CHANGES_STD := `find "$(THIS_DIR)" -newer "$(SIMPLENOTE_JS)" \( -name "*.js" -o -name "*.jsx" -o -name "*.json" -o -name "*.scss" -o -name "*.ts" -o -name "*.tsx" \) -type f -print -quit | grep -v .min. | wc -l`
SIMPLENOTE_BRANCH = $(shell git --git-dir .git branch | sed -n -e 's/^\* \(.*\)/\1/p')


##############
# SIMPLENOTE #
##############

# Node environment
NODE_ENV ?= production

# Defines if we should compile web app via `build` target
SKIP_BUILD ?= false

# Host for dev server
HOST ?= 0.0.0.0

# Port for dev server
PORT ?= 4000

### TODO: changes for HOST and PORT aren't yet reflected in `desktop/app.js`

# Access dev server or locally built web app files
DEV_SERVER ?= false

# electron-builder publish option
# options: always|onTag|onTagOrDraft|never
PUBLISH ?= onTag


# Main targets
.PHONY: start
start:
	@NODE_ENV=$(NODE_ENV) DEV_SERVER=$(DEV_SERVER) npx electron . --inspect

.PHONY: dev
dev:
	@npx misty

.PHONY: dev-server
dev-server:
	@$(MAKE) build NODE_ENV=$(NODE_ENV)

	@NODE_ENV=$(NODE_ENV) npx webpack serve --config ./webpack.config.js --content-base dist --host $(HOST) --port $(PORT) --hot

.PHONY: test
test:
	@npx jest --config=./jest.config.js


# Build web app
.PHONY: build
build:
ifeq ($(SKIP_BUILD),false)
	@echo "Building Simplenote Desktop on branch $(RED)$(SIMPLENOTE_BRANCH)$(RESET)"

# IS_PRODUCTION is a helper var for the inline conditional in `build-app`
ifeq ($(NODE_ENV),production)
	$(eval IS_PRODUCTION = true)
endif

	@$(MAKE) build-app NODE_ENV=$(NODE_ENV) IS_PRODUCTION=$(IS_PRODUCTION)
endif


# Build utils
.PHONY: build-app
build-app:
	@NODE_ENV=$(NODE_ENV) npx webpack $(if $(IS_PRODUCTION),-p) --config ./webpack.config.js

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
	@npx electron-builder -w --dir


# Build installers
.PHONY: package
package: build-if-changed

.PHONY: package-win32
package-win32:
ifeq ($(IS_WINDOWS),true)
	@echo Building .appx as well
	@npx electron-builder --win -p $(PUBLISH) --config=./electron-builder-appx.json
else
	@echo Skipping .appx as we are not on a Windows host
	@npx electron-builder --win -p $(PUBLISH)
endif

.PHONY: package-osx
package-osx: build-if-changed
	@npx electron-builder --mac "dmg" -p $(PUBLISH)

.PHONY: package-linux
package-linux: build-if-changed
	@npx electron-builder --linux -p $(PUBLISH)


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

.PHONY: format
format:
	@npx prettier --ignore-path .gitignore --write "**/*.{js,jsx,json,sass,ts,tsx}"

.PHONY: lint
lint: lint-js lint-scss

.PHONY: lint-scss
lint-scss:
	@npx stylelint --ignore-path .gitignore "**/*.scss" --syntax scss

.PHONY: lint-js
lint-js:
	@npx eslint --ignore-path .gitignore "**/*.{js,jsx,ts,tsx}"
