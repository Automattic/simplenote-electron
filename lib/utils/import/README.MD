# Simplenote Import

This is the core importer for Simplenote. It expects an object of notes in the same format as the `import` module. It is aggressive about only allowing certain properties, and converts dates into timestamps where appropriate. Importing specific export files (Such as Evernote .enex) should use a separate conversion script and then pass the resulting object to `importNotes()`.

Example object with allowed properties:

```
{
  "activeNotes": [
    {
      "content": "Random thought: How much wood could a woodchuck chuck if a woodchuck could chuck wood?",
      "creationDate": "2013-10-16T20:17:41.760Z",
      "lastModified": "2018-10-10T22:07:54.128Z",
      "pinned": true,
      "tags": [
        "Reminders"
      ]
    },
  ],
  "trashedNotes": [
    {
      "content": "Hello, world!",
      "creationDate": "2016-02-29T23:01:03.115Z",
      "lastModified": "2016-02-29T23:01:08.000Z"
    }
  ]
}
```
