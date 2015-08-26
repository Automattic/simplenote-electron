var Promise = require('promise');


module.exports = function(configure) {
  return new StoreProvider(configure);
};

function StoreProvider(configure) {
  var setup = this.setup = new Promise(function(resolve, reject){
    configure(resolve, reject);
  });
}

StoreProvider.prototype.provider = function() {
  var setup = this.setup;
  return function(bucket) {
    return new BucketStore(bucket, setup);
  };
};

function BucketStore(bucket, setup) {
  this.bucket = bucket;
  this.setup = setup;
}

BucketStore.prototype.withBucket = function(cb) {
  var bucket = this.bucket,
      self = this;

  this.setup.then(function(db) {
    cb.call(self, db, bucket.name);
  }, function(e) {
    console.error("Failed", e);
  });
};

BucketStore.prototype.get = function(id, callback) {
  this.withBucket(function(db, bucket) {
    db.transaction(bucket).get(id).onsuccess = function(e) {
      callback(null, e.target.result);
    };
  });
};

BucketStore.prototype.update = function(id, object, callback) {
  this.withBucket(function(db, bucket) {
    db.transaction(bucket, 'readwrite').objectStore(bucket).put({id: id, data: object}).onsuccess = function(e) {
      if (e.target.result) {
        callback(null, object);
      }
    };
  });
};

BucketStore.prototype.remove = function(id, callback) {
  this.withBucket(function(db, bucket) {
    db.transaction(bucket, 'readwrite').objectStore(bucket).delete(id).onsuccess = function(e) {
      callback(null, e.target.result);
    };
  });
};

BucketStore.prototype.find = function(query, callback) {

  this.withBucket(function(db, bucket) {

    var objects = [];
    var request = db.transaction(bucket).objectStore(bucket).openCursor();

    request.onsuccess = function(e) {
      var cursor = e.target.result;
      if (cursor) {
        objects.push(cursor.value);
        cursor.continue();
      } else {
        callback(null, objects);
      }
    };
    request.onerror = function(e) {
      console.lor("Failed");
    };
  });
};
