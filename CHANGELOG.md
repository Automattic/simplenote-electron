# Changelog

## [v1.3.0](https://github.com/Automattic/simplenote-electron/releases/tag/v1.3.0) (2018-11-28)

### New features

- Importers for Evernote (.enex) exports, Simplenote (.json) exports, and plain text files [#922](https://github.com/Automattic/simplenote-electron/pull/922) [#940](https://github.com/Automattic/simplenote-electron/pull/940) [#952](https://github.com/Automattic/simplenote-electron/pull/952) [#957](https://github.com/Automattic/simplenote-electron/pull/957) [#975](https://github.com/Automattic/simplenote-electron/pull/975) [#1033](https://github.com/Automattic/simplenote-electron/pull/1033)

### Enhancements

- Revamp auto updater [#869](https://github.com/Automattic/simplenote-electron/pull/869)
- Disable checkboxes and hide bullets in Markdown preview of task lists [#897](https://github.com/Automattic/simplenote-electron/pull/897) [@rakhi2104](https://github.com/rakhi2104)
- Add preview styling for `<kbd>` tags [#901](https://github.com/Automattic/simplenote-electron/pull/901) [@rakhi2104](https://github.com/rakhi2104)
- Add `markdown` property to the JSON file of exported notes [#938](https://github.com/Automattic/simplenote-electron/pull/938)
- Improve keyboard support for modal dialogs [#950](https://github.com/Automattic/simplenote-electron/pull/950)
- Show focus outlines on buttons and other controls when navigating with a keyboard [#962](https://github.com/Automattic/simplenote-electron/pull/962)
- Strip Markdown in note list excerpts (with the exception of ordered and unordered lists) [#996](https://github.com/Automattic/simplenote-electron/pull/996) [@ksdme](https://github.com/ksdme)

### Fixes

- Fix a crash bug that occurred when clicking the Share button immediately after selecting a tag in the tag drawer [#884](https://github.com/Automattic/simplenote-electron/pull/884)
- Remove outdated help text in the Share dialog [#919](https://github.com/Automattic/simplenote-electron/pull/919) [@rakhi2104](https://github.com/rakhi2104)
- Fix “bad quality package” error on Ubuntu [#933](https://github.com/Automattic/simplenote-electron/pull/933)
- Fix the Sidebar toggle button not working immediately after launch [#945](https://github.com/Automattic/simplenote-electron/pull/945)
- Make the Revisions selector full-width when in Focus Mode [#960](https://github.com/Automattic/simplenote-electron/pull/960) [@clayreimann](https://github.com/clayreimann)
- Fix issues with some buttons that were not friendly to screen readers [#961](https://github.com/Automattic/simplenote-electron/pull/961)
- Add a Back button for trashed notes in single-column view [#984](https://github.com/Automattic/simplenote-electron/pull/984) [@vadimnicolai](https://github.com/vadimnicolai)
- Fix line spacing when printing a Markdown note [#992](https://github.com/Automattic/simplenote-electron/pull/992) [@vadimnicolai](https://github.com/vadimnicolai)
- Fix margin on Publish icons in the note list [#997](https://github.com/Automattic/simplenote-electron/pull/997) [@vadimnicolai](https://github.com/vadimnicolai)
- Various security and under-the-hood improvements.

## [v1.2.1](https://github.com/Automattic/simplenote-electron/releases/tag/v1.2.1) (2018-10-16)

This is a rebuild of the faulty packages released as [v1.2.0](https://github.com/Automattic/simplenote-electron/releases/tag/v1.2.0). (Please refer to v1.2.0 for the changes)

## [v1.2.0](https://github.com/Automattic/simplenote-electron/releases/tag/v1.2.0) (2018-10-16)

_Update: There was a problem somewhere in the automated build system, and these packages will not work on Windows or Ubuntu. Please use the rebuilt packages from [v1.2.1](https://github.com/Automattic/simplenote-electron/releases/tag/v1.2.1)_

### New features
* [Focus Mode](https://github.com/Automattic/simplenote-electron/pull/881) to hide the note list pane. This can be toggled from the sidebar button, View menu, or shortcut ⌘⇧F.
* [Line Length](https://github.com/Automattic/simplenote-electron/pull/815) setting to wrap the note content to Full or Narrow widths.
* [Spell checker](https://github.com/Automattic/simplenote-electron/pull/821) (can be [toggled](https://github.com/Automattic/simplenote-electron/pull/872) on/off).

### Enhancements
* New user setting to [opt out](https://github.com/Automattic/simplenote-electron/pull/867) of analytics sharing.
* When exporting notes (File menu ▸ Export Notes), the Date Modified of each note file in the zip will reflect the [last modified date](https://github.com/Automattic/simplenote-electron/pull/826) of the note (props to @ianmorti).
* “Font Size” is renamed “Zoom” to match standard convention, and is now more discoverable at the [root level of the View menu](https://github.com/Automattic/simplenote-electron/pull/863) (props to @gie3d).
* The modification date will now [be updated](https://github.com/Automattic/simplenote-electron/pull/889) when adding or removing note tags (props to @hanhmchau).
* [Web] The [tag drawer will close](https://github.com/Automattic/simplenote-electron/issues/146) after opening the Settings dialog.

### Fixes
* [Mac] “Bring All to Front” is now in the [correct menu](https://github.com/Automattic/simplenote-electron/pull/813).
* Various security fixes.

## [v1.1.7](https://github.com/Automattic/simplenote-electron/releases/tag/v1.1.7) (2018-08-17)

Bug and security fixes.

## [v1.1.6](https://github.com/Automattic/simplenote-electron/releases/tag/v1.1.6) (2018-06-22)

Bug and security fixes.

## [v1.1.5](https://github.com/Automattic/simplenote-electron/releases/tag/v1.1.5) (2018-06-15)

Fixes a blank screen issue that could occur at smaller resolutions.

## [v1.1.4](https://github.com/Automattic/simplenote-electron/releases/tag/v1.1.4) (2018-06-15)

- You can now sign in with a WordPress.com account.
- Bug and security fixes.

## [v1.1.3](https://github.com/Automattic/simplenote-electron/releases/tag/v1.1.3) (2018-02-09)

- To save on editor space, the markdown Edit/Preview toggle has been moved to the toolbar. Look for the 👁
- Safety first! The app checks for any unsynced notes before logging out and warns if it finds any.
- Security fixes.

## [v1.1.2](https://github.com/Automattic/simplenote-electron/releases/tag/v1.1.2) (2018-01-10)

- Fixes an issue where new accounts could not sign in to the web app.
- Security fixes.

## [v1.1.1](https://github.com/Automattic/simplenote-electron/releases/tag/v1.1.1) (2017-12-12)

- Improved support for Markdown tables.
- Fixes issue where tags could become duplicated.

## [v1.1.0](https://github.com/Automattic/simplenote-electron/releases/tag/v1.1.0) (2017-11-21)

- UI improvements.
- Search for multiple tags in the search bar (type `tag:nameoftag`).
- Performance and reliability fixes.

## [v1.1.0-rc3](https://github.com/Automattic/simplenote-electron/releases/tag/1.1.0-rc3) (2017-11-17)

Even more bug fixes from RC2, and now includes 'no notes' placeholder.

## [v1.0.8](https://github.com/Automattic/simplenote-electron/releases/tag/v1.0.8) (2017-02-01)

- Search improvements: Match highlighting and clear search button added.
- You can now export your notes from the file menu.
- Performance and reliability improvements.

## [v1.0.7](https://github.com/Automattic/simplenote-electron/releases/tag/v1.0.7) (2016-12-03)

- Sync reliability fixes. Note: If the app is still out of sync after updating, try signing out and back in again.
- New notes now always open in edit mode.
- Syntax highlighting added in the Markdown preview.

## [v1.0.6](https://github.com/Automattic/simplenote-electron/releases/tag/v1.0.6) (2016-11-03)

Fixes Page Up/Down keys from showing the info panel erroneously.

## [v1.0.5](https://github.com/Automattic/simplenote-electron/releases/tag/v1.0.5) (2016-10-20)

Bug fixes, including:

- Fixes search bug and refactors `filterNotes()` [@dmsnell](https://github.com/dmsnell).
- Replace value link in tag list for controlled state changes [@dmsnell](https://github.com/dmsnell).
- Fix access to wrong variable name [@nfcampos](https://github.com/nfcampos).


## [v1.0.4](https://github.com/Automattic/simplenote-electron/releases/tag/v1.0.4) (2016-10-12)

- Replaced textarea-based note editor with Draft.js [@nfcampos](https://github.com/nfcampos)
- Fix revision slider where it was loading the oldest version of a note by default
- Add menu mnemonics [@bostrt](https://github.com/bostrt)
- Remove global Markdown setting
- Additional minor bug fixes.
  - Fix word counter with non ASCII characters
  - Find note when `state.note` doesn't exist
  - Replace search RegExp with simple string search [@nfcampos](https://github.com/nfcampos)

## [v1.0.3](https://github.com/Automattic/simplenote-electron/releases/tag/v1.0.3) (2016-08-26)

- Larger title in the note editor.
- Fix for username not displaying in settings.
- Additional minor bug fixes.

## [v1.0.2](https://github.com/Automattic/simplenote-electron/releases/tag/v1.0.2) (2016-06-28)

Bug fixes.

## [v1.0.1](https://github.com/Automattic/simplenote-electron/releases/tag/v1.0.1) (2016-04-30)

- Add selection to markdown preview.
- Title attribute tooltips.
- Open link on external browser.
- Submit login form on `enter`.
- Better exception management.
- Design updates.


## [v1.0.0](https://github.com/Automattic/simplenote-electron/releases/tag/v1.0.0) (2016-03-30)

Simplenote Desktop

## [v1.0.0-rc.2](https://github.com/Automattic/simplenote-electron/releases/tag/v1.0.0-rc.2) (2016-03-30)

- Merge pull request #262 from Automattic/fix/simperium-npm-version
- Fixes the Simperium version

## [v1.0.0-rc.1](https://github.com/Automattic/simplenote-electron/releases/tag/v1.0.0-rc.1) (2016-03-26)

## [v1.0.0-rc.0](https://github.com/Automattic/simplenote-electron/releases/tag/v1.0.0-rc.0) (2016-03-23)

Last version without updates notifications.
