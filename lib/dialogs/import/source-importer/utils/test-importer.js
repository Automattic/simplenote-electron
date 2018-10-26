import { EventEmitter } from 'events';

/**
 * A mock event emitter for testing/tweaking the UI.
 * @class
 */
class TestImporter extends EventEmitter {
  constructor() {
    super();
    let count = 1;
    const counter = window.setInterval(() => {
      this.emit('status', 'progress', count++);
    }, 10);
    window.setTimeout(() => {
      window.clearInterval(counter);
      this.emit('status', 'complete');
    }, 1000);
  }

  import(files) {
    console.log(files);
  }
}

export default TestImporter;
