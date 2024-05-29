# Changelog

## [v2.22.0]

### Fixes

- Adjusted word wrap borders in Safari to match other browsers [#3191](https://github.com/Automattic/simplenote-electron/pull/3191)
- Fixed an issue that caused the right-click menu to vanish immediately in Safari [#3192](https://github.com/Automattic/simplenote-electron/pull/3192)
- Fixed a bug where an email address in a note would cause the preview to be blank [#3205](https://github.com/Automattic/simplenote-electron/pull/3205)

### Other Changes

- Updated dependencies, build pipeline and documentation [#3183](https://github.com/Automattic/simplenote-electron/pull/3183), [#3097](https://github.com/Automattic/simplenote-electron/pull/3097), [#3194](https://github.com/Automattic/simplenote-electron/pull/3194), [#3195](https://github.com/Automattic/simplenote-electron/pull/3195)

## [v2.21.0]

### Enhancements

- Updated the remaining components to use CSS variables for colors [#3025](https://github.com/automattic/simplenote-electron/pull/3025), [#3024](https://github.com/automattic/simplenote-electron/pull/3024), [#3023](https://github.com/automattic/simplenote-electron/pull/3023), [#3022](https://github.com/automattic/simplenote-electron/pull/3022), [#3021](https://github.com/automattic/simplenote-electron/pull/3021), [#3020](https://github.com/automattic/simplenote-electron/pull/3020), [#3019](https://github.com/automattic/simplenote-electron/pull/3019), [#3018](https://github.com/automattic/simplenote-electron/pull/3018)
- Updated the message that is shown when attempting to log in with a known compromised password [#3013](https://github.com/automattic/simplenote-electron/pull/3013)
- Removed unused hint option in the importer dialog [#3027](https://github.com/automattic/simplenote-electron/pull/3027)
- Updated the CSS to complete the move to using CSS variables for colors [#3028](https://github.com/automattic/simplenote-electron/pull/3028)
- Updated login error handling for the case of too many login attempts [#3029](https://github.com/automattic/simplenote-electron/pull/3029)

## [v2.20.0]

### Enhancements

- Updated the Note Action components to use CSS variables for colors [#3001](https://github.com/automattic/simplenote-electron/pull/3001)
- Updated the Search Field and Tag Suggestion components to use CSS variables for colors [#2997](https://github.com/automattic/simplenote-electron/pull/2997)
- Updated the standard checkbox component to use individual SVG images for checked and unchecked states [#3002](https://github.com/automattic/simplenote-electron/pull/3002)

### Fixes

- Fixed the new note button separator color while in focus mode [#2998](https://github.com/automattic/simplenote-electron/pull/2998)

## [v2.19.0]

### Enhancements

- Updated to save the scroll position of a note so you can be restored when the note is viewed again [#2977](https://github.com/automattic/simplenote-electron/pull/2977)

## [v2.18.0]

### Enhancements

- Added support for handling failed logins due to having an unverified account email [#2976](https://github.com/automattic/simplenote-electron/pull/2976)
- [Internal] Added support for handling passwords found in known data breaches [#2972](https://github.com/automattic/simplenote-electron/pull/2972)
- [Internal] Updated Simperium library dependency to latest version [#2984](https://github.com/automattic/simplenote-electron/pull/2984)

## [v2.17.0]

### Enhancements

- Updated the Note List, Note Cell, and No Notes, components to use CSS variables for colors [#2969](https://github.com/automattic/simplenote-electron/pull/2969)

## [v2.16.0]

### Enhancements

- Updated tile icons for Windows with a new size and shadow [#2965](https://github.com/automattic/simplenote-electron/pull/2965)

## [v2.15.0]

### Enhancements

- Updated the Note Detail, Tag Field, Tag Input, and Tag Suggestion components to use CSS variables for colors [#2955](https://github.com/automattic/simplenote-electron/pull/2955)
- Updated the Note toolbar, Menu bar, Note editor, and Search field components to use CSS variables for colors [#2943](https://github.com/automattic/simplenote-electron/pull/2943)

### Fixes

- Fixed the font stack used so the font is consistent everywhere [#2946](https://github.com/automattic/simplenote-electron/pull/2946)
- Fixed the color used for headings on the login and sign up pages [#2947](https://github.com/automattic/simplenote-electron/pull/2947)

## [v2.14.0]

### Enhancements

- Updated the new note icon to the new design [#2939](https://github.com/automattic/simplenote-electron/pull/2939)
- Updated colors in dark mode to use CSS variables [#2936](https://github.com/automattic/simplenote-electron/pull/2936)

### Fixes

- Updated the logo used when pinning to the Windows start menu [#2937](https://github.com/automattic/simplenote-electron/pull/2937)

## [v2.13.0]

### Enhancements

- Upgraded the Electron and Electron Builder dependencies to newer versions [#2895](https://github.com/automattic/simplenote-electron/pull/2895)

### Fixes

- Fixed search scrollbar highlights so it always shows search matches while in the editor [#2910](https://github.com/automattic/simplenote-electron/pull/2910)

## [v2.12.0]

### Enhancements

- Added a tooltip to the note revision selector to better explain the new restore deleted tags action [#2899](https://github.com/automattic/simplenote-electron/pull/2899)
- Added a default window title bar to Mac Electron app [#2896](https://github.com/automattic/simplenote-electron/pull/2896)
- Updated CSS colors to use CSS variables [#2874](https://github.com/automattic/simplenote-electron/pull/2874), [#2885](https://github.com/automattic/simplenote-electron/pull/2885)

### Fixes

- Fixed search results bar to only use the plural Results if there is more than one matching keyword [#2892](https://github.com/automattic/simplenote-electron/pull/2892)
- Fixed spacing issue on the trash tag button when set to sort tags alphabetically [#2893](https://github.com/automattic/simplenote-electron/pull/2893)
- Fixed a bug where the Mac app wouldn't quit on the first request [#2901](https://github.com/automattic/simplenote-electron/pull/2901)

## [v2.11.0]

### Enhancements

- Updated search so that all notes are searched even if there is a currently selected tag [#2878](https://github.com/automattic/simplenote-electron/pull/2878)
- Added the option to search with `tag:untagged` to find notes without any tags [#2879](https://github.com/automattic/simplenote-electron/pull/2879)
- Shows tags to be restored on the note history screen [#2817](https://github.com/automattic/simplenote-electron/pull/2817)
- Added system theme for Mac and Windows Electron apps [#2882](https://github.com/automattic/simplenote-electron/pull/2882)
- Updated the method of setting the theme selection [#2873](https://github.com/automattic/simplenote-electron/pull/2873)
- Reduced the number of colors used throughout the project [#2872](https://github.com/automattic/simplenote-electron/pull/2872)

### Fixes

- Fixed a couple of bugs where the editor would get focus instead of staying with the search field [#2531](https://github.com/automattic/simplenote-electron/pull/2531)

## [v2.10.0]

### Enhancements

- Removed the sort options bar from the note list and updated the sort options in the Settings [#2841](https://github.com/automattic/simplenote-electron/pull/2841)
- Updated the design of the login/sign up form as well as clarifying the message shown when requesting an account [#2831](https://github.com/automattic/simplenote-electron/pull/2831)
- Updated the styling of the search UI including the search highlighting [#2791](https://github.com/automattic/simplenote-electron/pull/2791)
- Updated the note toolbar and note info sidebar to be two dialogs, one for note info, and one for note actions [#2622](https://github.com/automattic/simplenote-electron/pull/2622), [#2835](https://github.com/automattic/simplenote-electron/pull/2835), [#2843](https://github.com/automattic/simplenote-electron/pull/2843), [#2842](https://github.com/automattic/simplenote-electron/pull/2842)
- Added scrolling to the list of unsynchronized notes in the warning dialog [#2816](https://github.com/automattic/simplenote-electron/pull/2816)

### Fixes

- Fixed extra line breaks issue when exporting notes [#2819](https://github.com/automattic/simplenote-electron/pull/2819)
- Fixed displaying extra blank spaces in history screen [#2829](https://github.com/automattic/simplenote-electron/pull/2829), [#2867](https://github.com/automattic/simplenote-electron/pull/2867)
- Fixed to apply selected tag to a new note by default [#2556](https://github.com/automattic/simplenote-electron/pull/2556)
- Fixed spacing on unsynced notes warning message [#2797](https://github.com/automattic/simplenote-electron/pull/2797)
- Fixed cut off issue for dialogs when the window is too small [#2815](https://github.com/automattic/simplenote-electron/pull/2815), [#2834](https://github.com/automattic/simplenote-electron/pull/2834), [#2863](https://github.com/automattic/simplenote-electron/pull/2863)
- Fixed unnecessary separators in the Electron builds File and Edit menus when not yet logged in (props @Klauswk) [#2724](https://github.com/automattic/simplenote-electron/pull/2724)
- Fixed the clear search button so it does not appear unless there is a search term to clear [#2862](https://github.com/automattic/simplenote-electron/pull/2862)

## [v2.9.0]

### Enhancements

- Updated Focus Mode/Toggle Sidebar naming to be consistent using Focus Mode (props @dplanella) [#2792](https://github.com/Automattic/simplenote-electron/pull/2792)
- Removed the tag heading from the navigation menu when there are no tags [#2786](https://github.com/Automattic/simplenote-electron/pull/2786)
- Updated the number of lines in the note preview to be three lines in expanded display [#2785](https://github.com/automattic/simplenote-electron/pull/2785)
- Updated to autofocus the delete tag button when the confirmation dialog is opened [#2775](https://github.com/automattic/simplenote-electron/pull/2775)
- Improved parsing of multiple pasted tags [#2756](https://github.com/automattic/simplenote-electron/pull/2756)
- Improved accessibility of the application for keyboard and screen reader users [#2726](https://github.com/automattic/simplenote-electron/pull/2726)
- Improved error handling and messaging within the app [#2715](https://github.com/automattic/simplenote-electron/pull/2715)
- Improved navigation sidebar and revision selector accessibility for keyboards and screen readers [#2707](https://github.com/automattic/simplenote-electron/pull/2707)
- Updated imports to a single dialog where any supported file type can be imported at the same time [#2685](https://github.com/automattic/simplenote-electron/pull/2685)
- Improved recognizability of inline code elements [#2739](https://github.com/automattic/simplenote-electron/pull/2739)

### Fixes

- Fixed an issue when you rename a selected tag, the menubar title is updated to reflect the new tag name [#2784](https://github.com/automattic/simplenote-electron/pull/2784)
- Fixed the position of the offline badge indicator in Electron builds [#2778](https://github.com/automattic/simplenote-electron/pull/2778)
- Fixed some styling issues with the unsynchronized note warning dialog [#2776](https://github.com/automattic/simplenote-electron/pull/2776)
- Fixed editing of pending tag input [#2756](https://github.com/automattic/simplenote-electron/pull/2756)
- Fixed to only show scrollbars on the tag list when needed [#2753](https://github.com/automattic/simplenote-electron/pull/2753)
- Fixed dismissing the tooltip for disabled buttons [#2751](https://github.com/automattic/simplenote-electron/pull/2751)
- Fixed to checkboxes in preview mode [#2736](https://github.com/automattic/simplenote-electron/pull/2736)

## [v2.8.0]

### Enhancements

- Added Untagged Notes filter to sidebar [#2687](https://github.com/Automattic/simplenote-electron/pull/2687)
- Added a confirmation dialog before deleting a tag [#2653](https://github.com/Automattic/simplenote-electron/pull/2653)
- Updated the navigation bar styles [#2649](https://github.com/Automattic/simplenote-electron/pull/2649)
- Updated navigation bar color [#2645](https://github.com/Automattic/simplenote-electron/pull/2645)
- Updated tag input styling [#2608](https://github.com/Automattic/simplenote-electron/pull/2608), [#2748](https://github.com/Automattic/simplenote-electron/pull/2748)
- Updated styling of dialogs throughout the app [#2718](https://github.com/Automattic/simplenote-electron/pull/2718)
- Updated the Windows installation process to be able to choose to install for all users on the computer or just the current user [#2678](https://github.com/Automattic/simplenote-electron/pull/2678)
- Auto-remove line terminators like line separators (LS) or paragraph separator (PS) [#2713](https://github.com/Automattic/simplenote-electron/pull/2713)

### Fixes

- Ensure that tags on imported notes are added and synced properly [#2725](https://github.com/Automattic/simplenote-electron/pull/2725)
- Fixed overflowing dialog content when a long email address is used during signup [#2712](https://github.com/Automattic/simplenote-electron/pull/2712)
- Fix cut-off dialog close button in Safari [#2711](https://github.com/Automattic/simplenote-electron/pull/2711)
- Fixed a bug in note export to avoid duplicate filenames when certain characters were used in the note title [#2694](https://github.com/Automattic/simplenote-electron/pull/2694)
- Updated the view when no notes show in a specific list; fixed the view when adding a new note from the Trash [#2618](https://github.com/Automattic/simplenote-electron/pull/2618), [#2746](https://github.com/Automattic/simplenote-electron/pull/2746)
- Enable keyboard shortcut for search even when keyboard shortcut preference is set to be disabled [#2652](https://github.com/Automattic/simplenote-electron/pull/2652)
- Fixed a bug that caused Ctrl+G and some other shortcuts to fail on Windows/Linux [#2705](https://github.com/Automattic/simplenote-electron/pull/2705)
- Refresh the note list after restoring a revision [#2667](https://github.com/Automattic/simplenote-electron/pull/2667)
- Removed the spellcheck option from the Edit menu [#2650](https://github.com/Automattic/simplenote-electron/pull/2650)
- Fixed scrollbar styles in Firefox [#2641](https://github.com/Automattic/simplenote-electron/pull/2641)
- Fixed slider handle alignment in Chrome [#2720](https://github.com/Automattic/simplenote-electron/pull/2720)

### Other Changes

- Refactored reducer states showTrash and openedTag [#2706](https://github.com/Automattic/simplenote-electron/pull/2706)
- Pinned dependencies [#2642](https://github.com/Automattic/simplenote-electron/pull/2642)

## [v2.7.1]

### Enhancements

- Updated new account signup flow [#2695](https://github.com/Automattic/simplenote-electron/pull/2695)

## [v2.7.0]

### Enhancements

- Added a sort order bar to the note list [#2542](https://github.com/Automattic/simplenote-electron/pull/2542)
- Added a checklist icon to the note toolbar [#2603](https://github.com/Automattic/simplenote-electron/pull/2603)
- Updated tag renaming to be more consistent in the app and across platforms [#2602](https://github.com/Automattic/simplenote-electron/pull/2602)
- Moved the note revision slider to the bottom of the note [#2586](https://github.com/Automattic/simplenote-electron/pull/2586), [#2662](https://github.com/Automattic/simplenote-electron/pull/2662)
- Added the new note icon to the toolbar when in focus mode [#2596](https://github.com/Automattic/simplenote-electron/pull/2596), [#2671](https://github.com/Automattic/simplenote-electron/pull/2671)
- Updated the icon set [#2623](https://github.com/Automattic/simplenote-electron/pull/2623)
- Updated tag editing styles [#2584](https://github.com/Automattic/simplenote-electron/pull/2584)
- Adjusted note list width and font weights [#2631](https://github.com/Automattic/simplenote-electron/pull/2631)
- Updated pinner styles in the note list [#2624](https://github.com/Automattic/simplenote-electron/pull/2624)

### Fixes

- Tag input now inserts tags when a space is used or when clicking outside of the input area [#2607](https://github.com/Automattic/simplenote-electron/pull/2607)
- Updated Monaco editor to 0.22.0 to fix duplicate character inputs on Firefox [#2611](https://github.com/Automattic/simplenote-electron/pull/2611)
- Updated keyboard shortcut keys to display correctly based on platform [#2601](https://github.com/Automattic/simplenote-electron/pull/2601)
- Fixed a bug causing duplicate and unwanted items to appear in the context menu [#2669](https://github.com/Automattic/simplenote-electron/pull/2669)

## [v2.6.0]

### Enhancements

- Added email verification UI [#2587](https://github.com/Automattic/simplenote-electron/pull/2587)
- Moved search field into notes list and updated styles [#2580](https://github.com/Automattic/simplenote-electron/pull/2580), [#2595](https://github.com/Automattic/simplenote-electron/pull/2595)
- Added creation date to the note info panel [#2585](https://github.com/Automattic/simplenote-electron/pull/2585)
- Clarified the wording of the unsynchronized notes warning [#2594](https://github.com/Automattic/simplenote-electron/pull/2594)

### Fixes

- Added a missing aria-label to the revision slider (props to @tbourrely) [#2583](https://github.com/Automattic/simplenote-electron/pull/2583)
- Fixed loading of the analytics preference so it will send events if user has opted in [#2605](https://github.com/Automattic/simplenote-electron/pull/2605)

### Other Changes

- Allow installation without administrator privileges on Windows [#2581](https://github.com/Automattic/simplenote-electron/pull/2581)
- Upgraded some dependencies [#2575](https://github.com/Automattic/simplenote-electron/pull/2575) but partially-reverted this PR due to some text edit actions not working [#2604](https://github.com/Automattic/simplenote-electron/pull/2604)
- Updated the external Settings URL [#2591](https://github.com/Automattic/simplenote-electron/pull/2591)

## [v2.5.0]

### Fixes

- Fixed a bug that sometimes prevented checklists and bulleted lists from automatically continuing on the next line [#2548](https://github.com/Automattic/simplenote-electron/pull/2548)
- Fixed layout bugs causing the search results bar to overlap note contents and tag input field [#2545](https://github.com/Automattic/simplenote-electron/pull/2545)
- Fixed a bug where some search terms could be dropped when searching for quoted strings [#2550](https://github.com/Automattic/simplenote-electron/pull/2550)
- Fixed navigation list styles on Safari [#2552](https://github.com/Automattic/simplenote-electron/pull/2552)
- Fixed a bug causing notes to still be filtered after creating a new note from search results [#2557](https://github.com/Automattic/simplenote-electron/pull/2557)
- Load the correct configuration file in local development [#2536](https://github.com/Automattic/simplenote-electron/pull/2536)
- Fixed a crash on note search in Safari [#2538](https://github.com/Automattic/simplenote-electron/pull/2538)

### Other Changes

- Updated dependencies [#2547](https://github.com/Automattic/simplenote-electron/pull/2547)
- Updated arguments to addDynamicKeybinding function [#2546](https://github.com/Automattic/simplenote-electron/pull/2546)
- Prevent adding undefined as a className when no value provided (props to @ubaidisaev) [#2551](https://github.com/Automattic/simplenote-electron/pull/2551)

## [v2.4.0]

### Enhancements

- Added search context to the note list [#2424](https://github.com/Automattic/simplenote-electron/pull/2424)
- Use the Tab key to indent nested list items from anywhere within the line [#2515](https://github.com/Automattic/simplenote-electron/pull/2515), [#2518](https://github.com/Automattic/simplenote-electron/pull/2518)

### Fixes

- Fixed a crash when entering a multi-word search term in Expanded display mode [#2516](https://github.com/Automattic/simplenote-electron/pull/2516)
- Show error message when trying to import invalid JSON [#2446](https://github.com/Automattic/simplenote-electron/pull/2446)
- Fixed buggy cursor when hitting enter on an empty list item [#2519](https://github.com/Automattic/simplenote-electron/pull/2519)
- Made sidebar icons the correct shade of blue [#2513](https://github.com/Automattic/simplenote-electron/pull/2513)
- Fixed a crash when clicking on a tag suggestion from search [#2529](https://github.com/Automattic/simplenote-electron/pull/2529)

### Other Changes

- Only linkify HTTP and simplenote protocols in note preview [#2505](https://github.com/Automattic/simplenote-electron/pull/2505)
- Tab panels: Add some TypeScript declarations (props to @ubaidisaev) [#2489](https://github.com/Automattic/simplenote-electron/pull/2489)

## [v2.3.0]

### Fixes

- Fixed a bug causing the app to be missing from Windows 10 notification settings [#2483](https://github.com/Automattic/simplenote-electron/pull/2483)

## [v2.2.0]

### Enhancements

- Updated the tag panel UI [#2302](https://github.com/Automattic/simplenote-electron/pull/2302)

### Fixes

- Fixed an issue where deleting a tag did not immediately update the note [#2455](https://github.com/Automattic/simplenote-electron/pull/2455)
- Fixed Ctrl+Alt+Up/Down arrow selection shortcuts on Win/Linux [#2428](https://github.com/Automattic/simplenote-electron/pull/2428)
- Fixed a bug that prevented Follow Link / cmd+click from working on external links within the note editor [#2470](https://github.com/Automattic/simplenote-electron/pull/2470)
- Fixed inconsistent datetime formatting in the note info panel [#2473](https://github.com/Automattic/simplenote-electron/pull/2473)
- Fixed keyboard shortcuts sometimes not working on Win/Linux [#2490](https://github.com/Automattic/simplenote-electron/pull/2490)

### Other Changes

- Added ARM architectures to the Linux build [#2456](https://github.com/Automattic/simplenote-electron/pull/2456)

## [v2.1.0]

### Enhancements

- Added internal link references to the note info panel [#2412](https://github.com/Automattic/simplenote-electron/pull/2412)
- Display the canonical lexical version ensuring one capitalization or lexical version of a tag is displayed [#2435](https://github.com/Automattic/simplenote-electron/pull/2435)
- Suggest creating a new note when none exists or notes match search query [#2422](https://github.com/Automattic/simplenote-electron/pull/2422)
- Added autocompletion / inline search for internal note links [#2286](https://github.com/Automattic/simplenote-electron/pull/2286)

### Fixes

- Fixed a bug where Ctrl+G would not go to the next search result [#2402](https://github.com/Automattic/simplenote-electron/pull/2402)
- Fixed a bug preventing zoom shortcuts from being triggered by keys on the numeric keypad [#2404](https://github.com/Automattic/simplenote-electron/pull/2404)
- Fixed a bug causing zoom in / zoom out to only apply to the editor contents [#2406](https://github.com/Automattic/simplenote-electron/pull/2406)
- Fixed bug in note info panel where links did not copy in Firefox [#2414](https://github.com/Automattic/simplenote-electron/pull/2414)
- Prevent the scrollbar slider from becoming tiny when there are many notes in the note list [#2418](https://github.com/Automattic/simplenote-electron/pull/2418)
- Fixed checkboxes so that they can be checked in markdown mode [#2415](https://github.com/Automattic/simplenote-electron/pull/2415)
- Restored ability to toggle multiple checkboxes at once [#2419](https://github.com/Automattic/simplenote-electron/pull/2419)
- Made margin in editor clickable to focus editor [#2433](https://github.com/Automattic/simplenote-electron/pull/2433)
- Allow window to be closed when the user is logged out [#2439](https://github.com/Automattic/simplenote-electron/pull/2439)
- Clear search and close revision panel when creating a new note [#2434](https://github.com/Automattic/simplenote-electron/pull/2434)
- Fixed the Windows updater [#2440](https://github.com/Automattic/simplenote-electron/pull/2440)

### Other changes

- Updated the Simperium API token [#2387](https://github.com/Automattic/simplenote-electron/pull/2387)

## [v2.0.0]

### Enhancements

- Rewrite data flow in the app to remove races and sync bugs. This is a major update that involved a rewrite from the ground up of some key parts of the app, as well as replacing the editor component and adding support for internal links. [#2148](https://github.com/Automattic/simplenote-electron/pull/2148)
  - Server connection indicator in sidebar
  - Last synced time in note details
  - Support for internal (inter-note) links
  - Better performance on long notes
  - Custom search interface [#2313](https://github.com/Automattic/simplenote-electron/pull/2313), [#2292](https://github.com/Automattic/simplenote-electron/pull/2292)
  - Custom context menu [#2280](https://github.com/Automattic/simplenote-electron/pull/2280)
  - Make keyboard shortcuts aware of keyboard layout [#2334](https://github.com/Automattic/simplenote-electron/pull/2334)
  - Notifications when a note has changed on the server-side
  - A full log of changes in this long-running feature branch can be found at [https://github.com/Automattic/simplenote-electron/pulls?q=is%3Apr+is%3Aclosed+milestone%3ARewrite%2Fbeta](https://github.com/Automattic/simplenote-electron/pulls?q=is%3Apr+is%3Aclosed+milestone%3ARewrite%2Fbeta)
- Add support for importing .md files [#2351](https://github.com/Automattic/simplenote-electron/pull/2351)
- Linkify internal links in the editor [#2376](https://github.com/Automattic/simplenote-electron/pull/2376)

### Fixes

- Allow RTL formatting in Markdown mode [#2339](https://github.com/Automattic/simplenote-electron/pull/2339)
- Hide the search results banner when printing [#2348](https://github.com/Automattic/simplenote-electron/pull/2348)
- Display first note in Trash when opening Trash [#2349](https://github.com/Automattic/simplenote-electron/pull/2349)
- Fix a few bugs with undo/redo/selection [#2293](https://github.com/Automattic/simplenote-electron/pull/2293), [#2345](https://github.com/Automattic/simplenote-electron/pull/2345), [#2357](https://github.com/Automattic/simplenote-electron/pull/2357)
- Open note list when triggering search in narrow mode [#2340](https://github.com/Automattic/simplenote-electron/pull/2340)
- Fixed tag autocomplete not working with right arrow [#2350](https://github.com/Automattic/simplenote-electron/pull/2350)
- Hide scrollbars when printing on Legacy Edge [#2347](https://github.com/Automattic/simplenote-electron/pull/2347)
- Re-layout editor after focus mode change [#2371](https://github.com/Automattic/simplenote-electron/pull/2371)
- Allow Electron to handle keyboard shortcuts from the menu [#2370](https://github.com/Automattic/simplenote-electron/pull/2370)
- Make tags in list links until they are being edited [#2352](https://github.com/Automattic/simplenote-electron/pull/2352)
- Prompt when closing Electron if there are unsynchronized notes [#2277](https://github.com/Automattic/simplenote-electron/pull/2277)
- Terminology: Change "inter-note link" to "internal link" [#2360](https://github.com/Automattic/simplenote-electron/pull/2360)

### Other changes

- Security: Disabled Electron remote module [#2256](https://github.com/Automattic/simplenote-electron/pull/2256)
- Add Stylelint for sass linting [#2346](https://github.com/Automattic/simplenote-electron/pull/2346)

## [v1.21.1]

### Fixes

- Updated WordPress.com login flow to work on all platforms [#2285](https://github.com/Automattic/simplenote-electron/pull/2285)

## [v1.21.0]

### Enhancements

- Added logging and ability to download logs [#2194](https://github.com/Automattic/simplenote-electron/pull/2194)
- Added support for table alignment and strikethrough in Markdown [#2229](https://github.com/Automattic/simplenote-electron/pull/2229)

### Fixes

- Fixed Evernote import [#2201](https://github.com/Automattic/simplenote-electron/pull/2201)
- Fixed unsynced note dialog on logout [#2230](https://github.com/Automattic/simplenote-electron/pull/2230)
- Fixed a bug preventing login if capital letters were used in email address [#2226](https://github.com/Automattic/simplenote-electron/pull/2226)
- Show pointer cursor on checkboxes [#2189](https://github.com/Automattic/simplenote-electron/pull/2189)
- Disable menu items if user isn't logged in [#2228](https://github.com/Automattic/simplenote-electron/pull/2228), [#2232](https://github.com/Automattic/simplenote-electron/pull/2232)
- Restore ability to view About dialog while logged out [#2231](https://github.com/Automattic/simplenote-electron/pull/2231)
- Restore missing keyboard shortcut hint for Insert Checklist [#2233](https://github.com/Automattic/simplenote-electron/pull/2233)

## [v1.20.0]

### Enhancements

- Updated all icons to use the new Simplenote Blue [#2158](https://github.com/Automattic/simplenote-electron/pull/2158)
- Added Privacy Notice for California Users [#2177](https://github.com/Automattic/simplenote-electron/pull/2177)

### Fixes

- Prevent relative links in preview from opening a broken link in a new window [#2167](https://github.com/Automattic/simplenote-electron/pull/2167)

### Other Changes

- Updated Electron and associated dependencies to the latest [#2102](https://github.com/Automattic/simplenote-electron/pull/2102), [#2168](https://github.com/Automattic/simplenote-electron/pull/2168)
- Deleted deprecated "master" branch and updated configuration [#2159](https://github.com/Automattic/simplenote-electron/pull/2159)

## [v1.19.0]

### Fixes

- Fixed an issue causing note selection to unexpectedly change [#2111](https://github.com/Automattic/simplenote-electron/pull/2111)

### Other Changes

- Change "whitelist" to "allowlist" [#2146](https://github.com/Automattic/simplenote-electron/pull/2146)
- Added draft-js types [#2121](https://github.com/Automattic/simplenote-electron/pull/2121)
- Moved clipboard types to dev dependencies [#2122](https://github.com/Automattic/simplenote-electron/pull/2122)

## [v1.18.0]

### Enhancements

- Updated Blue to Simplenote Blue [#2043](https://github.com/Automattic/simplenote-electron/pull/2043)
- Simplify login form validation [#2095](https://github.com/Automattic/simplenote-electron/pull/2095)

### Other Changes

- Added types to react-tabs module [#2096](https://github.com/Automattic/simplenote-electron/pull/2096)
- Added UNSAFE to deprecated React methods [#2123](https://github.com/Automattic/simplenote-electron/pull/2123)
- Updated Publisher display name for Windows Store [#2131](https://github.com/Automattic/simplenote-electron/pull/2131)

## [v1.17.0]

### Enhancements

- Added option to disable keyboard shortcuts [#2075](https://github.com/Automattic/simplenote-electron/pull/2075)
- Added a password validation utility [#2086](https://github.com/Automattic/simplenote-electron/pull/2086), [#2114](https://github.com/Automattic/simplenote-electron/pull/2114) and stricter password requirements on signup [#2087](https://github.com/Automattic/simplenote-electron/pull/2087) and login [#2088](https://github.com/Automattic/simplenote-electron/pull/2088)

### Fixes

- Many keyboard shortcut fixes:
  - Delete note shortcut removed [#2076](https://github.com/Automattic/simplenote-electron/pull/2076)
  - Search shortcut changed to `CTRL+Shift+S` so that it does not conflict with the native browser find [#2078](https://github.com/Automattic/simplenote-electron/pull/2078)
  - Toggle focus on tag field changed from `CTRL/Cmd+T` to `CTRL/Cmd+Shift+Y` [#2081](https://github.com/Automattic/simplenote-electron/pull/2081)
  - Create a new note changed from `CTRL/Cmd+Shift+N` to `CTRL/Cmd+Shift+I` [#2080](https://github.com/Automattic/simplenote-electron/pull/2080)
  - Open the tag list changed from `CTRL/Cmd+Shift+T` to `CTRL/Cmd+Shift+U` [#2079](https://github.com/Automattic/simplenote-electron/pull/2079)
  - Added focus mode shortcut hint to View menu [#2082](https://github.com/Automattic/simplenote-electron/pull/2082)
- Fixed a bug causing occasional missing characters in note titles [#2063](https://github.com/Automattic/simplenote-electron/pull/2063)
- Defer re-decorating note when changing search [#2073](https://github.com/Automattic/simplenote-electron/pull/2073)

### Other Changes

- Refactor: Extract authentication and login screen from main app [#2066](https://github.com/Automattic/simplenote-electron/pull/2066)
- Build updates: Simplenote now supports armv7l (aka armhf on Debian) and arm64 platforms [#2042](https://github.com/Automattic/simplenote-electron/pull/2042); Added 32-bit version for Windows Store [#2067](https://github.com/Automattic/simplenote-electron/pull/2067)
- Refactor settings reducer [#2083](https://github.com/Automattic/simplenote-electron/pull/2083) and tag chip [#2068](https://github.com/Automattic/simplenote-electron/pull/2068)
- Added types to the Checkbox component [#2023](https://github.com/Automattic/simplenote-electron/pull/2023)

## [v1.16.0]

### Enhancements

- Added keyboard shortcuts help dialog [#1983](https://github.com/Automattic/simplenote-electron/pull/1983)
- Improve search performance [#1941](https://github.com/Automattic/simplenote-electron/pull/1941), [#1966](https://github.com/Automattic/simplenote-electron/pull/1966), [#1979](https://github.com/Automattic/simplenote-electron/pull/1979), [#1982](https://github.com/Automattic/simplenote-electron/pull/1982)

### Fixes

- Highlight all search matches in Markdown previews and in note list [#1987](https://github.com/Automattic/simplenote-electron/pull/1987)
- Fix for blurry fonts on LCD screens [#2003](https://github.com/Automattic/simplenote-electron/pull/2003)

### Other Changes

- Renamed RELEASE-NOTES to fix integrations broken by #1576 [#2018](https://github.com/Automattic/simplenote-electron/pull/2018)
- Extensive refactoring to move more code into Redux state:
  [#1920](https://github.com/Automattic/simplenote-electron/pull/1920) (tag selection),
  [#1928](https://github.com/Automattic/simplenote-electron/pull/1928) (system tag),
  [#1971](https://github.com/Automattic/simplenote-electron/pull/1971) (select trash and show all notes),
  [#1981](https://github.com/Automattic/simplenote-electron/pull/1981) (dialog renderer),
  [#1989](https://github.com/Automattic/simplenote-electron/pull/1989) (previous index),
  [#1991](https://github.com/Automattic/simplenote-electron/pull/1991) (tagsLoaded),
  [#1995](https://github.com/Automattic/simplenote-electron/pull/1995) (compositeNoteList),
  [#1996](https://github.com/Automattic/simplenote-electron/pull/1996) (tag suggestions),
  [#1999](https://github.com/Automattic/simplenote-electron/pull/1999) (load tags),
  [#2004](https://github.com/Automattic/simplenote-electron/pull/2004) (isElectron and isMac utils),
- Replace custom height cache with one provided by react-virtualized [#1829](https://github.com/Automattic/simplenote-electron/pull/1829)
- Dependencies updated [#1951](https://github.com/Automattic/simplenote-electron/pull/1951), [#1993](https://github.com/Automattic/simplenote-electron/pull/1993)

## [v1.15.1]

### Other Changes

- Fix application signing to generate proper appx for Windows Store [#1960](https://github.com/Automattic/simplenote-electron/pull/1960)

## [v1.15.0]

### Enhancements

- Stop erasing the copy buffer if copying empty editor selections [#1847](https://github.com/Automattic/simplenote-electron/pull/1847)
- Allow for un-selecting a tag by tab or right arrow [#1853](https://github.com/Automattic/simplenote-electron/pull/1853) @qualitymanifest

### Fixes

- Highlight search results in note list regardless of case [#1831](https://github.com/Automattic/simplenote-electron/pull/1831)
- Stop wiping out tag name when renaming a tag [#1834](https://github.com/Automattic/simplenote-electron/pull/1834)
- Only render markdown syntax in note list if markdown enabled for note [#1839](https://github.com/Automattic/simplenote-electron/pull/1839)
- Fix up/down keyboard navigation in Windows Chrome [#1888](https://github.com/Automattic/simplenote-electron/pull/1888)
- Stop accidentally hiding the _Edit Tag_ button when clicking on it [#1900](https://github.com/Automattic/simplenote-electron/pull/1900)
- Make tag auto-suggest case-insensitive [#1905](https://github.com/Automattic/simplenote-electron/pull/1905)
- Incorporate second fix for Unicode bug with successive surrogate pairs [#1912](https://github.com/Automattic/simplenote-electron/pull/1912)
- Render unicode bullet as a list item in Markdown preview [#1922](https://github.com/Automattic/simplenote-electron/pull/1922)

### Other Changes

- Added type information throughout the codebase
- Refactored internal state and data flow
  [#1851](https://github.com/Automattic/simplenote-electron/pull/1851) (selected note),
  [#1866](https://github.com/Automattic/simplenote-electron/pull/1866) (editor mode),
  [#1870](https://github.com/Automattic/simplenote-electron/pull/1870) (connection status),
  [#1871](https://github.com/Automattic/simplenote-electron/pull/1871) (unsync'd note ids),
  [#1881](https://github.com/Automattic/simplenote-electron/pull/1881) (search query),
  [#1895](https://github.com/Automattic/simplenote-electron/pull/1895) (close note action),
  [#1896](https://github.com/Automattic/simplenote-electron/pull/1896) (various UI toggles),
  [#1899](https://github.com/Automattic/simplenote-electron/pull/1899) (tag editing),
  [#1901](https://github.com/Automattic/simplenote-electron/pull/1901) (show trash),
  [#1902](https://github.com/Automattic/simplenote-electron/pull/1902) (filter list title),
  [#1903](https://github.com/Automattic/simplenote-electron/pull/1903) (viewing revisions),
  [#1907](https://github.com/Automattic/simplenote-electron/pull/1907) (toggle navigation),
  [#1914](https://github.com/Automattic/simplenote-electron/pull/1914) (search field focus),
  [#1919](https://github.com/Automattic/simplenote-electron/pull/1919) (previous selected note),
  [#1921](https://github.com/Automattic/simplenote-electron/pull/1921) (revision fetching)
- Updated dependencies [#1771](https://github.com/automattic/simplenote-electron/pull/1771), [#1848](https://github.com/Automattic/simplenote-electron/pull/1848)
- Improve reliability of end-to-end tests by removing data races and test parallelism [#1913](https://github.com/automattic/simplenote-electron/pull/1913)
- Connect Redux Devtools store enhancer for easier debugging [#1918](https://github.com/Automattic/simplenote-electron/pull/1918)
- Removed `hard-source-plugin` for more reliable builds [#1924](https://github.com/Automattic/simplenote-electron/pull/1924)

## [v1.14.0]

### Enhancements

- Keep note open when transitioning to small screen in focus mode [#1763](https://github.com/Automattic/simplenote-electron/pull/1763)
- Added GenericName (description) field for app on Linux [#1761](https://github.com/Automattic/simplenote-electron/pull/1761)
- Allow width attribute on img tags [#1833](https://github.com/Automattic/simplenote-electron/pull/1833)

### Fixes

- Makes settings scrollable on shorter smaller view ports [#1767](https://github.com/Automattic/simplenote-electron/pull/1767)
- After selecting a revision to restore ensure that choice is sync'd [#1774](https://github.com/Automattic/simplenote-electron/pull/1774)
- Added indication that publish url has been copied [#1743](https://github.com/Automattic/simplenote-electron/pull/1743)
- Disallow partial emails and user's own email from being adding to collaborators email field [#1735](https://github.com/Automattic/simplenote-electron/pull/1735)
- Fixed keyboard shortcut to toggle markdown preview [#1788](https://github.com/Automattic/simplenote-electron/pull/1788)
- Fixed an issue where typing a comma in the tag input would insert an empty tag [#1798](https://github.com/Automattic/simplenote-electron/pull/1798)
- When system theme is selected in Settings, changing the system theme is now immediately reflected in the app [#1801](https://github.com/Automattic/simplenote-electron/pull/1801)
- Show all checkboxes and search results in note list [#1814](https://github.com/Automattic/simplenote-electron/pull/1814)
- Fix ol numbering in markdown preview [#1823](https://github.com/Automattic/simplenote-electron/pull/1823)
- Prevents weird effects in live previews due to incomplete input [#1822](https://github.com/Automattic/simplenote-electron/pull/1822)
- Fixed a bug where searching for a tag containing non-alphanumeric characters erroneously returned no notes [#1828](https://github.com/Automattic/simplenote-electron/pull/1828)
- Properly close revision/history view when clicking outside of slider [#1837](https://github.com/Automattic/simplenote-electron/pull/1837)

### Other Changes

- Updated dependencies [#1759](https://github.com/Automattic/simplenote-electron/pull/1759)
- Applied prettier formatting to all files [#1780](https://github.com/Automattic/simplenote-electron/pull/1780)
- Delete unused tab restriction util [#1783](https://github.com/Automattic/simplenote-electron/pull/1783)
- Migrate TransitionDelayEnter to React hooks [#1784](https://github.com/Automattic/simplenote-electron/pull/1784)
- Added git hooks to run format, lints, and tests [#1790](https://github.com/Automattic/simplenote-electron/pull/1790)
- Added React Hooks ESLint Plugin [#1789](https://github.com/Automattic/simplenote-electron/pull/1789)
- Added end-to-end testing with Spectron [#1773](https://github.com/Automattic/simplenote-electron/pull/1773)
- Removed a workaround for indexing note pinned status [#1795](https://github.com/Automattic/simplenote-electron/pull/1795)
- Maintenance cleanups [#1796](https://github.com/Automattic/simplenote-electron/pull/1796), [#1797](https://github.com/Automattic/simplenote-electron/pull/1797), [#1808](https://github.com/Automattic/simplenote-electron/pull/1808), [#1809](https://github.com/Automattic/simplenote-electron/pull/1809), [#1810](https://github.com/Automattic/simplenote-electron/pull/1810), [#1811](https://github.com/Automattic/simplenote-electron/pull/1811)
- Updated dependencies [#1802](https://github.com/Automattic/simplenote-electron/pull/1802)
- Updated dependencies [#1821](https://github.com/Automattic/simplenote-electron/pull/1821)
- Fixed build warning [#1806](https://github.com/Automattic/simplenote-electron/pull/1806)
- Refactor how notes are filtered for better performance and maintainability [#1812](https://github.com/Automattic/simplenote-electron/pull/1812)

## [v1.13.0]

### Enhancements

- Added matching tags to the notes list on search [#1648](https://github.com/Automattic/simplenote-electron/pull/1648)

### Fixes

- Revision selector is now usable without dragging the entire window [#1741](https://github.com/Automattic/simplenote-electron/pull/1741)
- Only display view settings when coming from the old web app [#1736](https://github.com/Automattic/simplenote-electron/pull/1736)
- Fixed a bug where initial "s" was getting removed from note titles in preview [#1748](https://github.com/Automattic/simplenote-electron/pull/1748)

### Other Changes

- Updated dependencies [#1738](https://github.com/Automattic/simplenote-electron/pull/1738)

## [v1.12.0]

### Enhancements

- Updated menu icon to use the new icon set [#1694](https://github.com/Automattic/simplenote-electron/pull/1694)
- Added script to deploy web app [#1723](https://github.com/Automattic/simplenote-electron/pull/1723)
- Prioritize search results where title matches query [#1705](https://github.com/Automattic/simplenote-electron/pull/1705)

### Fixes

- Fixed markdown code styles [#1702](https://github.com/Automattic/simplenote-electron/pull/1702)
- Stop crashing app in a few cases where it shouldn't [#1721](https://github.com/Automattic/simplenote-electron/pull/1721)
- Prevent infinite duplication of changes caused by relying on shared note bucket [#1724](https://github.com/Automattic/simplenote-electron/pull/1724)
- Prevent note corruption in certain cases involving Asian characters, Emoji, and "surrogate pairs" [#1714](https://github.com/Automattic/simplenote-electron/pull/1714)

### Other Changes

- Updated dependencies [#1693](https://github.com/Automattic/simplenote-electron/pull/1693)
- Stop app boot when missing platform support and indicate what is missing [#1713](https://github.com/Automattic/simplenote-electron/pull/1713)

## [v1.11.0]

### Enhancements

### Fixes

- Fixed bug that only shows the first line of text in note list preview [#1647](https://github.com/Automattic/simplenote-electron/pull/1647)

### Other Changes

## [v1.10.0]

### Enhancements

- Add ability to select system as a theme option and make it the default
- Added support for the unicode bullet • in list items
- Display a notice that notes are loading when notes are loading
- In dev mode open Chrome Dev Tools in a separate window

### Fixes

- Rework WordPress.com signin to prevent infinite looping and login failures [#1627](https://github.com/Automattic/simplenote-electron/pull/1627)
- Update link to release-notes in updater config: CHANGELOG -> RELEASE_NOTES
- Stop showing that there are no notes when initially loading notes from the server. [#1680](https://github.com/Automattic/simplenote-electron/pull/1680)

### Other changes

- Updated dependencies

## [v1.9.1]

### Fixes

- Prevent ulimited duplication of changes after signing out and signing in [#1664](https://github.com/Automattic/simplenote-electron/pull/1664)

## [v1.9.0]

### Enhancements

- Open new note automatically upon creation [1582](https://github.com/Automattic/simplenote-electron/pull/1582)
- Updated colors to use Color Studio, the color palette for Automattic products
  - [#1565](https://github.com/Automattic/simplenote-electron/pull/1565)
  - [#1612](https://github.com/Automattic/simplenote-electron/pull/1612)

### Fixes

- Hovering over a clickable or editable UI element now show the correct cursor for its type [#1573](https://github.com/Automattic/simplenote-electron/pull/1573)
- Fixes vertical spacing with nested markdown lists
- Fixes sort order on revision slider when the timestamps don't match the change sequence [#1605](https://github.com/Automattic/simplenote-electron/pull/1605)
- Prevents note corruption when receiving remote updates when local updates are pending
  - [#1598](https://github.com/Automattic/simplenote-electron/pull/1598)
  - [#1599](https://github.com/Automattic/simplenote-electron/pull/1599)

### Other changes

- Renamed CHANGELOG.md to RELEASE-NOTES.txt [#1576](https://github.com/Automattic/simplenote-electron/pull/1576)
- Added tests to Checkbox component [#1580](https://github.com/Automattic/simplenote-electron/pull/1580)
- Added a GitHub Action to deploy develop and master branches [#1603](https://github.com/Automattic/simplenote-electron/pull/1603)
- Stopped aborting development builds on `eslint` errors [#1594](https://github.com/Automattic/simplenote-electron/pull/1594)

## [v1.8.0](https://github.com/Automattic/simplenote-electron/releases/tag/v1.8.0)

- Updated Log in and Sign up form to match current styling [#1459](https://github.com/Automattic/simplenote-electron/pull/1459)

## [v1.7.0](https://github.com/Automattic/simplenote-electron/releases/tag/v1.7.0) (2019-08-12)

### Fixes

- Updates to dark mode styling [#1452](https://github.com/Automattic/simplenote-electron/pull/1452)
- Updated several dependencies

## [v1.6.0](https://github.com/Automattic/simplenote-electron/releases/tag/v1.6.0) (2019-07-01)

### Features

- Add custom tooltips to toolbar buttons [#1214](https://github.com/Automattic/simplenote-electron/pull/1214)
- Improve search performance on long notes [#1218](https://github.com/Automattic/simplenote-electron/pull/1218)
- Fixed a linting error [#1427](https://github.com/Automattic/simplenote-electron/pull/1427)

### Fixes

- Extract text manipulation helpers ( [#1212](https://github.com/Automattic/simplenote-electron/pull/1212) )
- Refactor settings state ( [#1216](https://github.com/Automattic/simplenote-electron/pull/1216) )
- Remove hacky focus manipulation in DraftJS ( [#1219](https://github.com/Automattic/simplenote-electron/pull/1219) )
- Remove unused build files ( [#1173](https://github.com/Automattic/simplenote-electron/pull/1173) )
- Keep editor in sync with selected note in NoteList ( [#1220](https://github.com/Automattic/simplenote-electron/pull/1220) )
- Fix large tag-list squashing note-list ( [#1227](https://github.com/Automattic/simplenote-electron/pull/1227) )
- Updated GitHub templates
- Updated most dependencies
- Fix Prettier Errors ( [#1343](https://github.com/Automattic/simplenote-electron/pull/1343) )
- Use md5 node module ( [#1308](https://github.com/Automattic/simplenote-electron/pull/1308) )
- Remove ajv peer dependency ( [#1360](https://github.com/Automattic/simplenote-electron/pull/1360) )
- Fix linting warning in tag-chip ( [#1314](https://github.com/Automattic/simplenote-electron/pull/1314) )
- Fix linting warning in lib/app ( [#1313](https://github.com/Automattic/simplenote-electron/pull/1313) )
- Fix linting warning in lib/auth/index ( [#1311](https://github.com/Automattic/simplenote-electron/pull/1311) )
- Docs update: Additional step in installing ( [#1252](https://github.com/Automattic/simplenote-electron/pull/1252) )

## [v1.5.0](https://github.com/Automattic/simplenote-electron/releases/tag/v1.5.0) (2019-02-21)

### Features

- Add a sync indicator in the Navigation Bar that shows the last synced time, as well as a list of unsynced notes when edits are made while disconnected from the server [#1201](https://github.com/Automattic/simplenote-electron/pull/1201)

### Fixes

- Fix issue where in short or empty notes, the clickable area did not expand to the height of the editor [#1199](https://github.com/Automattic/simplenote-electron/pull/1199)
- Fix a Dark Mode color glitch in the Note List on Ubuntu [#1202](https://github.com/Automattic/simplenote-electron/pull/1202)
- Change the Insert Checklist shortcut to <kbd>Ctrl+Shift+C</kbd> (<kbd>Cmd+Shift+C</kbd> on macOS) to avoid a conflict with Polish keyboards [#1210](https://github.com/Automattic/simplenote-electron/pull/1210)
- Tweak the dropzone color to preserve the dashed border in Light Mode [#1211](https://github.com/Automattic/simplenote-electron/pull/1211)
- Remove unneeded border when printing [#1206](https://github.com/Automattic/simplenote-electron/pull/1206)
- Fix wrong icon in the “Check for Updates” dialog on Linux [#1172](https://github.com/Automattic/simplenote-electron/pull/1172)
- Fix CJK-related text duplication bugs after a tab character [#1172](https://github.com/Automattic/simplenote-electron/pull/1172)
- Make “Select All” work in the Markdown Preview [#1172](https://github.com/Automattic/simplenote-electron/pull/1172)

## [v1.4.1](https://github.com/Automattic/simplenote-electron/releases/tag/v1.4.1) (2019-02-08)

### Enhancements

- Keep approximate cursor position when a remote change comes in from the server [#1193](https://github.com/Automattic/simplenote-electron/pull/1193) [@qualitymanifest](https://github.com/qualitymanifest)

### Fixes

- Verify last used monitor availability when restoring window position [#1176](https://github.com/Automattic/simplenote-electron/pull/1176)
- Fix erratic cursor jumps to last line [#1193](https://github.com/Automattic/simplenote-electron/pull/1193)

## [v1.4.0](https://github.com/Automattic/simplenote-electron/releases/tag/v1.4.0) (2019-01-29)

### Features

- Checklists! Markdown-style checkboxes (`- [ ]` and `- [x]`) will now be rendered in the Editor as a clickable checkbox. Checklists can also be added from the Format ▸ Insert Checklist menu item [#1145](https://github.com/Automattic/simplenote-electron/pull/1145) [#1154](https://github.com/Automattic/simplenote-electron/pull/1154) [#1159](https://github.com/Automattic/simplenote-electron/pull/1159) [#1166](https://github.com/Automattic/simplenote-electron/pull/1166) [#1168](https://github.com/Automattic/simplenote-electron/pull/1168)

### Enhancements

- Change the button icon in the top left corner from a tag to a hamburger menu [#1106](https://github.com/Automattic/simplenote-electron/pull/1106)
- Improve accessibility of the tab panels in the Settings and Share dialogs [#1109](https://github.com/Automattic/simplenote-electron/pull/1109)
- Add a Tools panel (containing the Import/Export functions) to the Settings dialog [#1111](https://github.com/Automattic/simplenote-electron/pull/1111)
- Add ability to toggle checkboxes in the Markdown preview [#1133](https://github.com/Automattic/simplenote-electron/pull/1133)
- Show Published icon in Condensed view [#1110](https://github.com/Automattic/simplenote-electron/pull/1110)
- Add a “Check for Updates” menu item [#1090](https://github.com/Automattic/simplenote-electron/pull/1090)
- Improve alphabetical note sorting to ignore accents, diacritics, and leading `#` characters [#1144](https://github.com/Automattic/simplenote-electron/pull/1144)
- Improve contrast in Dark Mode [#1062](https://github.com/Automattic/simplenote-electron/pull/1062)

### Fixes

- Prevent the Search Bar from shrinking when there are no notes [#1108](https://github.com/Automattic/simplenote-electron/pull/1108)
- In narrow screen sizes, correctly close the note after a “Trash” or “Restore from Trash” command [#1131](https://github.com/Automattic/simplenote-electron/pull/1131)
- Make the text in the Markdown preview selectable [#1132](https://github.com/Automattic/simplenote-electron/pull/1132)
- Update the selected note when notes have reloaded [#1130](https://github.com/Automattic/simplenote-electron/pull/1130)
- Prevent Note List excerpts from being to short [#1104](https://github.com/Automattic/simplenote-electron/pull/1104)
- Fix an issue where a local change to a note’s content would reselect that note in the Editor, even when the user had already navigated away to a different note [#1141](https://github.com/Automattic/simplenote-electron/pull/1141)
- Fix lag when renaming tags [#1127](https://github.com/Automattic/simplenote-electron/pull/1127)
- Remove unnecessary left border in Focus Mode [#1149](https://github.com/Automattic/simplenote-electron/pull/1149) [@qualitymanifest](https://github.com/qualitymanifest)
- Prevent Markdown list prefixes from multiplying when hitting Return [#1148](https://github.com/Automattic/simplenote-electron/pull/1148)
- When copying a note, ensure that the raw text is copied to the clipboard instead of rich text [#1155](https://github.com/Automattic/simplenote-electron/pull/1155)
- Fix line break behavior in the Markdown preview to match common Markdown implementations, as well as the other Simplenote apps [#1169](https://github.com/Automattic/simplenote-electron/pull/1169)
- Fix CJK-related crashes after a tab character [#1171](https://github.com/Automattic/simplenote-electron/pull/1171)
- Various security and under-the-hood improvements

## [v1.3.4](https://github.com/Automattic/simplenote-electron/releases/tag/v1.3.4) (2018-12-18)

### Fixes

- Prevent a performance issue that can occur when there is a lot of whitespace in a Markdown note [#1078](https://github.com/Automattic/simplenote-electron/pull/1078) [#1088](https://github.com/Automattic/simplenote-electron/pull/1088)
- Restore tags correctly when restoring a revision [#1085](https://github.com/Automattic/simplenote-electron/pull/1085)
- Ensure that the note selected on launch is updated [#1093](https://github.com/Automattic/simplenote-electron/pull/1093)
- Improve tag field styles to accommodate notes with many tags [#1084](https://github.com/Automattic/simplenote-electron/pull/1084)
- Ensure that offline changes are synced to the server once the app is back online, even if the app was quit before syncing [#1098](https://github.com/Automattic/simplenote-electron/pull/1098) [#1103](https://github.com/Automattic/simplenote-electron/pull/1103)
- Add rate limiter to Importer to prevent overloading the server [#1101](https://github.com/Automattic/simplenote-electron/pull/1101)

## [v1.3.3](https://github.com/Automattic/simplenote-electron/releases/tag/v1.3.3) (2018-12-06)

### Fixes

- Prevent unnecessary server calls when logged out [#1067](https://github.com/Automattic/simplenote-electron/pull/1067) [#1068](https://github.com/Automattic/simplenote-electron/pull/1068) [#1071](https://github.com/Automattic/simplenote-electron/pull/1071)

## [v1.3.2](https://github.com/Automattic/simplenote-electron/releases/tag/v1.3.2) (2018-12-05)

### Enhancements

- Add support for sorting the tags list [#1042](https://github.com/Automattic/simplenote-electron/pull/1042)

### Fixes

- Add `:focus` outline to dropzone [#989](https://github.com/Automattic/simplenote-electron/pull/989)
- Fix tag entry in Chinese, Japanese, and Korean [#999](https://github.com/Automattic/simplenote-electron/pull/999)
- Make tag entry and removal smoother [#1000](https://github.com/Automattic/simplenote-electron/pull/1000)
- Fix padding for trash toolbar in Mac Electron [#1005](https://github.com/Automattic/simplenote-electron/pull/1005)
- Fix password change handling [#1022](https://github.com/Automattic/simplenote-electron/pull/1022)
- Simplify printing [#1013](https://github.com/Automattic/simplenote-electron/pull/1013)
- Fix incorrect menu labels in note sorting options [#1023](https://github.com/Automattic/simplenote-electron/pull/1023) [@tonytettinger](https://github.com/tonytettinger)
- Never launch in fullscreen mode [#1002](https://github.com/Automattic/simplenote-electron/pull/1002)
- Fix button styles in the tag drawer [#1031](https://github.com/Automattic/simplenote-electron/pull/1031)
- Fix app description [#1030](https://github.com/Automattic/simplenote-electron/pull/1030)
- Fix errors in app menus [#1004](https://github.com/Automattic/simplenote-electron/pull/1004)
- Delete AppData on uninstall (Windows) [#1029](https://github.com/Automattic/simplenote-electron/pull/1029)
- Fix app icon in Windows Store build [#1065](https://github.com/Automattic/simplenote-electron/pull/1065)

## v1.3.1

This release is only intended for distribution in the Windows Store. It fixes a login issue that only affected the build available there.

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

- [Focus Mode](https://github.com/Automattic/simplenote-electron/pull/881) to hide the note list pane. This can be toggled from the sidebar button, View menu, or shortcut ⌘⇧F.
- [Line Length](https://github.com/Automattic/simplenote-electron/pull/815) setting to wrap the note content to Full or Narrow widths.
- [Spell checker](https://github.com/Automattic/simplenote-electron/pull/821) (can be [toggled](https://github.com/Automattic/simplenote-electron/pull/872) on/off).

### Enhancements

- New user setting to [opt out](https://github.com/Automattic/simplenote-electron/pull/867) of analytics sharing.
- When exporting notes (File menu ▸ Export Notes), the Date Modified of each note file in the zip will reflect the [last modified date](https://github.com/Automattic/simplenote-electron/pull/826) of the note (props to @ianmorti).
- “Font Size” is renamed “Zoom” to match standard convention, and is now more discoverable at the [root level of the View menu](https://github.com/Automattic/simplenote-electron/pull/863) (props to @gie3d).
- The modification date will now [be updated](https://github.com/Automattic/simplenote-electron/pull/889) when adding or removing note tags (props to @hanhmchau).
- [Web] The [tag drawer will close](https://github.com/Automattic/simplenote-electron/issues/146) after opening the Settings dialog.

### Fixes

- [Mac] “Bring All to Front” is now in the [correct menu](https://github.com/Automattic/simplenote-electron/pull/813).
- Various security fixes.

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
