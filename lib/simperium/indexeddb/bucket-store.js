export class BucketStore {
  constructor(bucket, setup) {
    this.bucket = bucket;
    this.setup = setup;
    this.beforeIndex = a => a;
  }

  withBucket = callback =>
    this.setup
      .then(db => callback.call(this, db, this.bucket.name))
      .catch(e => console.log('Failed', e)); // eslint-disable-line no-console

  get = (id, callback) =>
    this.withBucket((db, bucket) => {
      const req = db
        .transaction(bucket)
        .objectStore(bucket)
        .get(id);

      req.onsuccess = ({ target: { result } }) => callback(null, result);
      req.onerror = e => callback(e);
    });

  update = (id, data, isIndexing, callback) =>
    this.withBucket((db, bucket) => {
      const req = db
        .transaction(bucket, 'readwrite')
        .objectStore(bucket)
        .put(this.beforeIndex({ id, data }));

      req.onsuccess = () => this.get(id, callback);
      req.onerror = e => callback(e);
    });

  remove = (id, callback) =>
    this.withBucket(
      (db, bucket) =>
        (db
          .transaction(bucket, 'readwrite')
          .objectStore(bucket)
          .delete(id).onsuccess = ({ target: { result } }) =>
          callback(null, result))
    );

  find = (query, callback) =>
    this.withBucket((db, bucket) => {
      const objects = [];
      const request = db
        .transaction(bucket)
        .objectStore(bucket)
        .openCursor();

      request.onsuccess = ({ target: { result: cursor } }) =>
        cursor
          ? objects.push(cursor.value) && cursor.continue()
          : callback(null, objects);

      request.onerror = e => callback(e);
    });
}
