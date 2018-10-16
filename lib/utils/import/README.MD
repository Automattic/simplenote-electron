# Simplenote Import

This is the core importer for Simplenote. It expects a JSON object of notes in the same format as the `import` module. It is aggressive about only allowing certain properties, and converts dates into timestamps where appropriate. Importing specific export files (Such as Evernote .enex) should use a separate conversion script and then pass the resulting JSON object to `importNotes()`.

Example JSON:

```
{
  "activeNotes": [
    {
      "id": "279d0a2a9cbf4107830175fd6b562f62",
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
      "id": "80461f52-2c63-4f3f-825e-69a0236da327",
      "content": "Hello?",
      "creationDate": "2016-02-29T23:01:03.115Z",
      "lastModified": "2016-02-29T23:01:08.000Z"
    }
  ]
}
```
