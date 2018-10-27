import { EventEmitter } from 'events';

/**
 * A mock event emitter for testing/tweaking the UI.
 * @class
 */
class TestImporter extends EventEmitter {
  constructor(arg) {
    super();
    console.log(arg);
  }

  importNotes(files) {
    console.log(files);

    let count = 0;
    const counter = window.setInterval(() => {
      this.emit('status', 'progress', ++count);
    }, 10);
    window.setTimeout(() => {
      window.clearInterval(counter);
      // Swap commented-out lines to test success/error events
      // this.emit('status', 'error', 'Error processing data.');
      this.emit('status', 'complete', count);
    }, 1000);
  }
}

export default TestImporter;
