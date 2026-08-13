/**
 * Request-level diagnostics for `--verbose` / SIMPLENOTE_CLI_DEBUG=1.
 *
 * Debug lines always go to stderr: stdout is the machine channel for --json
 * and must stay byte-clean. The flag is module-level on purpose so infra
 * layers (http, note-source) can emit without threading a context object
 * through every call.
 */
let verbose = false;

export function setVerbose(value: boolean): void {
  verbose = value;
}

export function isVerbose(): boolean {
  return verbose;
}

export function debug(message: string): void {
  if (verbose) {
    console.error(`[cli] ${message}`);
  }
}
