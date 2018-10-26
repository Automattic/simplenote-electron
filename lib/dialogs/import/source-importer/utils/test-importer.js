import { EventEmitter } from 'events';

/**
 * A mock event emitter for testing/tweaking the UI.
 * @class
 */
class TestImporter extends EventEmitter {
  constructor(buckets) {
    super();

    console.log(buckets);

    let count = 1;
    const counter = window.setInterval(() => {
      this.emit('status', 'progress', count++);
    }, 10);
    window.setTimeout(() => {
      window.clearInterval(counter);
      this.emit('status', 'complete');
    }, 1000);
  }

  import(files, options) {
    console.log(files);
    console.log(options);
  }
}

export default TestImporter;
