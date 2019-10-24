import { BucketStore } from './bucket-store';

export class StoreProvider {
  constructor(config) {
    this.setup = new Promise((resolve, reject) => config(resolve, reject));
  }

  provider = () => bucket => new BucketStore(bucket, this.setup);

  reset = () =>
    this.setup
      .then(db =>
        Promise.all(
          Array.prototype.map.call(
            db.objectStoreNames,
            name =>
              new Promise((resolve, reject) => {
                const tx = db.transaction(name, 'readwrite');
                const request = tx.objectStore(name).clear();

                request.onsuccess = () => resolve(name);
                request.onerror = e => reject(e);
              })
          )
        )
      )
      .catch(e => console.error('Failed to reset stores', e)); // eslint-disable-line no-console
}

export default config => new StoreProvider(config);
