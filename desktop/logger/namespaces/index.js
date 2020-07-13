/**
 * Credit: Modified from `winston-namespace` by @SetaSouto:
 * 	https://github.com/SetaSouto/winston-namespace
 */

module.exports = {
  /**
   * Boolean indicating if the object is populated with the environment data.
   */
  populated: false,
  /**
   * Populates the private data 'namespaces' as an array with the environment from the NODE_ENV
   * environment variable. It splits the data with ',' as separator.
   * @private
   */
  populate: function () {
    this.namespaces = [process.env.NODE_ENV === 'production' ? '' : '*'];
    this.populated = true;
  },
  /**
   * Checks if the namespace is available to debug. The namespace could be contained in wildcards.
   * Ex: 'server:api:controller' would pass the check (return true) if the 'server:api:controller' is in the
   * environment variable or if 'server:api:*' or 'server:*' is in the environment variable.
   * @param namespace {String} - Namespace to check.
   * @returns {boolean} Whether or not the namespace is available.
   */
  check: function (namespace) {
    if (!this.populated) {
      this.populate();
    }

    if (this.namespaces.includes('*')) {
      return true;
    }

    if (this.namespaces.includes(namespace)) {
      return true;
    }

    return namespace
      .split(':')
      .some((_, level, levels) =>
        this.namespaces.includes(levels.slice(0, level).join(':') + ':*')
      );
  },
};
