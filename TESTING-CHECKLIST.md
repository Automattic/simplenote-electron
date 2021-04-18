## Testing

### Login/Signup

- [ ] Logout
- [ ] Login with wrong password fails
- [ ] Login with correct password succeeds
- [ ] Signup with unique email address succeeds, welcome note is shown after

### Sync

- [ ] Created note appears in other device
- [ ] Changes to new note sync to/from other device
- [ ] New tag immediately syncs to/from other device
- [ ] Removed tag immediately syncs to/from other device
- [ ] Note publishes with link
- [ ] Note unpublishes
- [ ] Note publish change syncs _from_ other device (visible with dialog open)
- [ ] Markdown setting syncs to/from other device
- [ ] Preview mode disappears/reappears when receiving remote changes to markdown setting
- [ ] Note pinning syncs immediately to/from other device
- [ ] Note pinning works regardless if selecting in list view or from note info
- [ ] Viewing history on one device leaves note unchanged on other device
- [ ] Restoring history immediately syncs note to/from other device
- [ ] Restoring history revisions updates pinned status
- [ ] Restoring history revisions updates markdown status
- [ ] Restoring history revisions updates publish status
- [ ] Syncs when introducing sequential surrogate pairs sharing the same high surrogate, e.g. `🅰🅱` to `🅰🅰🅱`
- [ ] When disabling network connectivity, the app will warn user of any unsynced changes if they attempt to close the application
- [ ] After going back online, changes sync

### Note editor

- [ ] Can preview markdown with 👁 button
- [ ] Can flip to edit mode with 👁 button
- [ ] Using the `Insert checklist` item from the format menu inserts a checklist
- [ ] "Undo" undoes the last edit
- [ ] Typing `- [x]` creates a checked checklist item
- [ ] Typing `- [ ]` created an unchecked checklist item
- [ ] Typing `-` creates a list
- [ ] Typing _tab_ in a list item underneath another list item indents item
- [ ] Typing _shift tab_ in the same spot unindents the list
- [ ] Changing `-` to `+` changes the list item bullet, also for `*` and `•` (`\u2022`)
- [ ] All list bullet types render to markdown lists
- [ ] Added URL is linkified
- [ ] When clicking on link it opens in new window
- [ ] Can print note in plaintext view
- [ ] Can print note in Markdown-preview view

### Tags & search

- [ ] When Markdown enabled, formatting is hidden in notes list for note. i.e. `### Part 1` is presented as `Part 1` to save up space. 
- [ ] Markdown syntax unrendered in note list when markdown disabled
- [ ] Can filter by tag when clicking on tag in tag drawer
- [ ] Can add tag to note and have it appear in filtered tag view when previously not in filter
- [ ] Can search by keyword with tag selected
- [ ] Searching in the search field highlights matches in note list
- [ ] Searching in the search field highlights matches in the note editor
- [ ] Searching in the search field highlights matches in the note editor during preview
- [ ] Clearing the search field immediately updates filtered notes
- [ ] Clicking on different tags or `All Notes` or `Trash` immediately updates filtered notes
- [ ] Can search by keyword, filtered instantly
- [ ] Tag auto-completes appear when typing in search field
- [ ] Typing `tag:` does not result a list of all tags in the autocompleter
- [ ] Typing `tag:` and something else, like `tag:te` results in autocomplete results starting with that something else, e.g. `test`
- [ ] Tag suggestions suggest tags regardless of case
- [ ] Search field updates with results of `tag:test` format search string

### Trash

- [ ] Can view trashed notes by clicking on `Trash`
- [ ] Can delete note forever from trash screen
- [ ] Can restore note from trash screen
- [ ] Can trash note
- [ ] Selects note below recently-trashed note
- [ ] Selects note below recently-restored note in trash view
- [ ] Selects note below recently-deleted-forever note in trash view


### Settings

- [ ] Can toggle sidebar
- [ ] Can change analytics sharing setting
- [ ] Changing `Note Display` mode immediately updates and reflects in note list
- [ ] Changing `Sort Type` mode immediately updates and reflects in note list
- [ ] Toggling `Sort Order` immediately updates and reflects in note list for each sort type
- [ ] For each sort type the pinned notes appear first in the note list
- [ ] Changing `Theme` immediately updates app for desired color scheme
- [ ] With sidebar disabled, toggling `Line Length` between `Narrow` and `Full` removes and adds border around note content appropriately and immediately.


### Keyboard shortcuts 

- [ ] <kbd>CmdOrCtrl</kbd> + <kbd>shift</kbd> + <kbd>p</kbd> toggles preview mode
- [ ] <kbd>CmdOrCtrl</kbd> + <kbd>shift</kbd> + (<kbd>k</kbd>) selects next note above current note, stops at top of list
- [ ] <kbd>CmdOrCtrl</kbd> + <kbd>shift</kbd> + (<kbd>j</kbd>) selects next note below current note, stops at bottom of list
- [ ] <kbd>CmdOrCtrl</kbd> + <kbd>shift</kbd> + <kbd>U</kbd> toggles tab list
- [ ] <kbd>CmdOrCtrl</kbd> + <kbd>shift</kbd> + <kbd>I</kbd> creates new note
- [ ] <kbd>CmdOrCtrl</kbd> + <kbd>shift</kbd> + <kbd>L</kbd> _when in small screen mode_ navigates to note list
