# frozen_string_literal: true

source 'https://rubygems.org'

# Normally, we'd let fastlane-plugin-wpmreleasetoolkit transitively fetch Fastlane.
# But there's a bug in the version it resolves by default that we need to fix for while we wait for the plugin to update the resolved version.
#
# 2.219.0 includes a fix for a bug introduced in 2.218.0
# See https://github.com/fastlane/fastlane/issues/21762#issuecomment-1875208663
gem 'fastlane', '~> 2.219'
# This comment avoids typing to switch to a development version for testing.
#
# gem 'fastlane-plugin-wpmreleasetoolkit', git: 'https://github.com/wordpress-mobile/release-toolkit', ref: ''
gem 'fastlane-plugin-wpmreleasetoolkit', '~> 11.0'
# TODO: Remove once Dangermattic is set up
gem 'rubocop', '~> 1.61'
