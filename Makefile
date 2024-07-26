ifeq ($(OS),Windows_NT)
	FILE_PATH_SEP := \\
	IS_WINDOWS := true
else
	FILE_PATH_SEP := /
endif

/ = $(FILE_PATH_SEP)

THIS_MAKEFILE_PATH := $(word $(words $(MAKEFILE_LIST)),$(MAKEFILE_LIST))
THIS_DIR := $(shell cd $(dir $(THIS_MAKEFILE_PATH));pwd)

CONF_FILE_ENCRYPTED=./resources/secrets/config.json.enc
CONF_FILE=./config-local.json

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
#
# Unfortunately, electron-builder does not recognize Buildkite as a provider, so we need to manually check that.
# See https://github.com/electron-userland/electron-builder/blob/14942b70a5da79a5e36e330f64de66ec501b4ac6/packages/electron-publish/src/publisher.ts#L139
#
# Notice the use of ?= to still be able to override at call time
ifeq ($(strip $(BUILDKITE_TAG)),)
	PUBLISH ?= never
else
	PUBLISH ?= always
endif

# Main targets
.PHONY: start
start:
	@NODE_ENV=$(NODE_ENV) DEV_SERVER=$(DEV_SERVER) npx electron . --inspect --watchDir=./desktop

.PHONY: dev
dev:
	@NODE_ENV=development DEV_SERVER=true npx concurrently -c gray.dim "make dev-server" "wait-on http://localhost:4000 && make start"

.PHONY: dev-server
dev-server:
	@$(MAKE) build NODE_ENV=$(NODE_ENV)

	@NODE_ENV=$(NODE_ENV) npx webpack serve --config ./webpack.config.js --static dist --host $(HOST) --port $(PORT) --hot

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
	@NODE_ENV=$(NODE_ENV) npx webpack $(if $(IS_PRODUCTION),--mode production) --config ./webpack.config.js

.PHONY: build-if-not-exists
build-if-not-exists: config.json
	@if [ -f $(SIMPLENOTE_JS) ]; then \
		echo "File $(SIMPLENOTE_JS) exists, skipping build."; \
		true; \
	else \
		echo "File $(SIMPLENOTE_JS) does not exist, running build."; \
		make build; \
	fi

.PHONY: build-if-changed
build-if-changed: build-if-not-exists
	@if [ $(SIMPLENOTE_CHANGES_STD) -eq 0 ]; then \
		echo "No changes detected, skipping build."; \
		true; \
	else \
		echo "Changes detected, running build."; \
		make build; \
	fi


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
	@echo Packaging .exe...
	@npx electron-builder --win -p $(PUBLISH)
ifeq ($(IS_WINDOWS),true)
	@echo Packaging .appx as well...
	@npx electron-builder --win -p $(PUBLISH) --config=./electron-builder-appx.json
else
	@echo Skipping packaging .appx because we are not running on a Windows machine.
endif

.PHONY: package-osx
package-osx: build-if-changed
	@npx electron-builder --mac "dmg" -p $(PUBLISH)
	@npx electron-builder --mac "zip" -p $(PUBLISH)

.PHONY: package-linux
package-linux: build-if-changed
	@npx electron-builder --linux -p $(PUBLISH)


# NPM
.PHONY:
install: node_modules

node_modules/%:
	@npm install $(notdir $@) --legacy-peer-deps

node_modules: package.json
	@npm prune --legacy-peer-deps
	@npm install --legacy-peer-deps
	@touch node_modules


# Checks
config.json:
ifeq (,$(wildcard $(THIS_DIR)$/$CONF_FILE))
	$(error $(CONF_FILE) not found. Required file, see docs)
endif


# Utils
.PHONY: config-release
config-release: config.json install

.PHONY: format
format:
	@npx prettier --write "**/*.{js,jsx,json,sass,scss,ts,tsx}"

.PHONY: lint
lint: lint-js lint-scss

.PHONY: lint-scss
lint-scss:
	@npx stylelint --ignore-path .gitignore "**/*.scss"

.PHONY: lint-js
lint-js:
	@npx eslint --ignore-path .gitignore "**/*.{js,jsx,ts,tsx}"


# encrypted config file
.PHONY: _pwd_prompt decrypt_conf encrypt_conf

# 'private' task for echoing instructions
_pwd_prompt:
ifeq ($(strip $(CI)),)
	@echo "Check the secret store for Simplenote!"
else
	@echo "Use input disabled because running in CI (CI env var set)"
endif

OPENSSL_CMD=openssl aes-256-cbc -pbkdf2
DECRYPT_CMD=${OPENSSL_CMD} -d -in ${CONF_FILE_ENCRYPTED} -out ${CONF_FILE}
# to create config for local development
decrypt_conf: _pwd_prompt
ifeq ($(strip $(CI)),)
	${DECRYPT_CMD}
else
ifeq ($(strip $(SECRETS_ENCRYPTION_KEY)),)
	$(error Could not decode $(CONF_FILE) because SECRETS_ENCRYPTION_KEY is missing from environment.)
else
	@${DECRYPT_CMD} -k ${SECRETS_ENCRYPTION_KEY}
endif
endif

# for updating the stored config with the local values
encrypt_conf: _pwd_prompt
	${OPENSSL_CMD} -e -in ${CONF_FILE} -out ${CONF_FILE_ENCRYPTED}
