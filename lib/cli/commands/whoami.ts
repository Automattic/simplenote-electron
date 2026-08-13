import type { Credentials } from '../domain/types.ts';
import { hasFlag, rejectExtraPositionals } from '../cli-args.ts';

/**
 * Prints the logged-in username.
 *
 * Trivial, and it used to be written inline in app.ts's dispatch table for
 * exactly that reason. That made app.ts the one place that was both the
 * dispatcher *and* a command implementation: it had to import `hasFlag` and
 * `rejectExtraPositionals` — argv primitives no other part of app.ts needs —
 * and `whoami` was the only verb with no module to hold its tests. Size is
 * not what decides which layer a thing belongs to.
 */
export async function whoamiCommand(
  credentials: Credentials,
  args: string[]
): Promise<void> {
  rejectExtraPositionals(args, 'whoami', 0);
  if (hasFlag(args, 'json')) {
    console.log(JSON.stringify({ username: credentials.username }));
    return;
  }
  console.log(credentials.username);
}
