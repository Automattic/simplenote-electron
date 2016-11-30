# Simplenote Export

This module provides a function which can be used to export all of the notes for a given account.

The output format is a single JSON file containing a map of two arrays: the active notes in an account; the trashed notes in an account.

The notes will be sorted by last modification time with the most recently-modified notes appearing first in the list.

Currently the export functionality is only available through the developer console and has no corresponding component in the main app.

## How to export

Open the developer console. This will require either a modified version of the app enabling the console or running the app locally in a development environment inside a browser.

Creating an export is as simple as running the following command from the developer console since the export function is made available in the global namespace.

```js
exportNotes()
```

After the export finishes it will trigger a download in the browser window.

## Example export

```json
{
  "activeNotes": [ {
    "id": "some-auto-generated-id",
    "content": "Simplenote is so simple! I love it.",
    "creationDate": "2016-11-18T23:28:42.957Z",
    "lastModified": "2016-12-22T21:59:36.623Z"
  }, {
    "id": "some-auto-generated-id-that-is-unique",
    "content": "This note can be accessed from a secret URL",
    "creationDate": "2016-07-02T07:24:22.699Z",
    "lastModified": "2016-11-29T16:55:49.890Z",
    "publicURL": "http://simp.ly/p/short-url-string"
  }, {
    "id": "some-auto-generated-id-again",
    "content": "Sharing is caring",
    "creationDate": "2016-10-01T08:40:33.968Z",
    "lastModified": "2016-10-30T01:57:56.050Z",
    "tags": [
      "reminders",
      "people"
    ],
    "collaboratorEmails": [
      "prince@example.com",
      "pauper@example.com"
    ]
  } ],
  "trashedNotes": [ {
    "id": "some-different-auto-generated-id",
    "content": "This note is no longer relevant",
    "creationDate": "2015-11-18T10:13:42.138Z",
    "lastModified": "2016-01-13T14:03:33.583Z",
    "tags": [
      "the departed"
    ]
  } ]
}
```
