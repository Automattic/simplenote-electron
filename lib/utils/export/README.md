# Simplenote Export

This module provides a couple of functions for exporting all of the notes in the active account.

The output of `exportNote()` is an object containing a map of two arrays: the active notes in an account; the trashed notes in an account.

The notes will be sorted by last modification time with the most recently-modified notes appearing first in the list.

The output from `exportNotes()` can be fed into `noteExportToZip()` to generate a [JSZip](https://github.com/Stuk/jszip) object containing the information for creating a zip archive of the notes.
This archive contains each note as its own file with a generated filename and the list of associated tags at the end of the content.

## Example export

```json
{
  "activeNotes": [
    {
      "id": "some-auto-generated-id",
      "content": "Simplenote is so simple! I love it.",
      "creationDate": "2016-11-18T23:28:42.957Z",
      "lastModified": "2016-12-22T21:59:36.623Z"
    },
    {
      "id": "some-auto-generated-id-that-is-unique",
      "content": "This note can be accessed from a secret URL",
      "creationDate": "2016-07-02T07:24:22.699Z",
      "lastModified": "2016-11-29T16:55:49.890Z",
      "publicURL": "https://simp.ly/p/short-url-string"
    },
    {
      "id": "some-auto-generated-id-again",
      "content": "Sharing is caring",
      "creationDate": "2016-10-01T08:40:33.968Z",
      "lastModified": "2016-10-30T01:57:56.050Z",
      "tags": ["reminders", "people"],
      "collaboratorEmails": ["prince@example.com", "pauper@example.com"]
    }
  ],
  "trashedNotes": [
    {
      "id": "some-different-auto-generated-id",
      "content": "This note is no longer relevant",
      "creationDate": "2015-11-18T10:13:42.138Z",
      "lastModified": "2016-01-13T14:03:33.583Z",
      "tags": ["the departed"]
    }
  ]
}
```
