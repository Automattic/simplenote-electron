/**
 * Shared selection-offset remapping for remote note content changes.
 *
 * Monaco applies the Simperium patch form via ui/reducer.ts. Markdown uses the
 * same op walker here, either from a string diff or from Simperium patch ops.
 */

export type TextEditOp =
  | { kind: 'equal'; length: number }
  | { kind: 'delete'; length: number }
  | { kind: 'insert'; text: string };

const MAX_LCS_CHARS = 4096;

function mergeDiffOps(ops: TextEditOp[]): TextEditOp[] {
  const merged: TextEditOp[] = [];
  for (const op of ops) {
    const last = merged[merged.length - 1];
    if (last && last.kind === op.kind) {
      if (last.kind === 'equal' && op.kind === 'equal') {
        last.length += op.length;
      } else if (last.kind === 'delete' && op.kind === 'delete') {
        last.length += op.length;
      } else if (last.kind === 'insert' && op.kind === 'insert') {
        last.text += op.text;
      }
      continue;
    }
    merged.push({ ...op });
  }
  return merged;
}

function diffMiddle(before: string, after: string): TextEditOp[] {
  if (before === after) {
    return [];
  }
  if (before.length === 0) {
    return [{ kind: 'insert', text: after }];
  }
  if (after.length === 0) {
    return [{ kind: 'delete', length: before.length }];
  }
  if (after.endsWith(before)) {
    const inserted = after.slice(0, after.length - before.length);
    return inserted.length > 0
      ? [
          { kind: 'insert', text: inserted },
          { kind: 'equal', length: before.length },
        ]
      : [{ kind: 'equal', length: before.length }];
  }
  if (before.endsWith(after)) {
    const removed = before.slice(0, before.length - after.length);
    return removed.length > 0
      ? [
          { kind: 'delete', length: removed.length },
          { kind: 'equal', length: after.length },
        ]
      : [{ kind: 'equal', length: after.length }];
  }
  if (before.length + after.length <= MAX_LCS_CHARS) {
    return lcsDiffOps(before, after);
  }

  return [
    { kind: 'delete', length: before.length },
    { kind: 'insert', text: after },
  ];
}

function lcsDiffOps(before: string, after: string): TextEditOp[] {
  const rows = before.length + 1;
  const cols = after.length + 1;
  const dp = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      dp[i][j] =
        before[i - 1] === after[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const ops: TextEditOp[] = [];
  let i = before.length;
  let j = after.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && before[i - 1] === after[j - 1]) {
      let length = 0;
      while (i > 0 && j > 0 && before[i - 1] === after[j - 1]) {
        length++;
        i--;
        j--;
      }
      ops.push({ kind: 'equal', length });
      continue;
    }

    if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      let text = '';
      while (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        if (i > 0 && before[i - 1] === after[j - 1]) {
          break;
        }
        text = after[j - 1] + text;
        j--;
      }
      ops.push({ kind: 'insert', text });
      continue;
    }

    let length = 0;
    while (i > 0 && (j === 0 || dp[i - 1][j] >= dp[i][j - 1])) {
      if (j > 0 && before[i - 1] === after[j - 1]) {
        break;
      }
      length++;
      i--;
    }
    ops.push({ kind: 'delete', length });
  }

  return mergeDiffOps(ops.reverse());
}

/** Build edit ops from a before/after string pair. */
export function diffStringsToOps(before: string, after: string): TextEditOp[] {
  if (before === after) {
    return [];
  }

  let prefix = 0;
  while (
    prefix < before.length &&
    prefix < after.length &&
    before[prefix] === after[prefix]
  ) {
    prefix++;
  }

  let suffix = 0;
  while (
    suffix < before.length - prefix &&
    suffix < after.length - prefix &&
    before[before.length - 1 - suffix] === after[after.length - 1 - suffix]
  ) {
    suffix++;
  }

  const ops: TextEditOp[] = [];
  if (prefix > 0) {
    ops.push({ kind: 'equal', length: prefix });
  }

  const beforeMiddle = before.slice(prefix, before.length - suffix);
  const afterMiddle = after.slice(prefix, after.length - suffix);
  ops.push(...diffMiddle(beforeMiddle, afterMiddle));

  if (suffix > 0) {
    ops.push({ kind: 'equal', length: suffix });
  }

  return mergeDiffOps(ops);
}

/** Parse Simperium note.content patch ops (= / - / +). */
export function simperiumContentPatchToOps(patches: string[]): TextEditOp[] {
  const ops: TextEditOp[] = [];

  for (const patch of patches) {
    const op = patch[0];
    const data = patch.slice(1);
    switch (op) {
      case '=':
        ops.push({ kind: 'equal', length: parseInt(data, 10) });
        break;
      case '-':
        ops.push({ kind: 'delete', length: parseInt(data, 10) });
        break;
      case '+':
        ops.push({ kind: 'insert', text: decodeURIComponent(data) });
        break;
    }
  }

  return mergeDiffOps(ops);
}

/** Map a single offset in `before` content to the same logical point in `after`. */
export function remapOffsetThroughOps(
  ops: TextEditOp[],
  offset: number,
  beforeLength: number
): number {
  const target = Math.max(0, Math.min(offset, beforeLength));
  let beforeIndex = 0;
  let afterIndex = 0;

  for (const op of ops) {
    switch (op.kind) {
      case 'equal': {
        if (target <= beforeIndex + op.length) {
          return afterIndex + (target - beforeIndex);
        }
        beforeIndex += op.length;
        afterIndex += op.length;
        break;
      }
      case 'delete': {
        if (target <= beforeIndex + op.length) {
          return afterIndex;
        }
        beforeIndex += op.length;
        break;
      }
      case 'insert': {
        afterIndex += op.text.length;
        break;
      }
    }
  }

  return afterIndex;
}

export function remapOffsetsThroughOps(
  ops: TextEditOp[],
  anchor: number,
  focus: number,
  beforeLength: number
): [number, number] {
  return [
    remapOffsetThroughOps(ops, anchor, beforeLength),
    remapOffsetThroughOps(ops, focus, beforeLength),
  ];
}

export function remapOffsetThroughStringDiff(
  before: string,
  after: string,
  offset: number
): number {
  if (before === after) {
    return offset;
  }

  return remapOffsetThroughOps(
    diffStringsToOps(before, after),
    offset,
    before.length
  );
}

export function remapOffsetsThroughStringDiff(
  before: string,
  after: string,
  anchor: number,
  focus: number
): [number, number] {
  if (before === after) {
    return [anchor, focus];
  }

  return remapOffsetsThroughOps(
    diffStringsToOps(before, after),
    anchor,
    focus,
    before.length
  );
}

/**
 * Same algorithm as ui/reducer.ts editorSelection on REMOTE_NOTE_UPDATE.
 * Offsets must be in the same string space as the patched original content.
 */
export function remapOffsetsThroughSimperiumContentPatch(
  patches: string[],
  start: number,
  end: number
): [number, number] {
  const [nextStart, nextEnd] = patches.reduce(
    (offsets: [number, number, number], patch) => {
      const [anchor, focus, patchOffset] = offsets;
      if (patchOffset > anchor && patchOffset > focus) {
        return offsets;
      }

      const op = patch[0];
      const data = patch.slice(1);
      switch (op) {
        case '=':
          return [anchor, focus, patchOffset + parseInt(data, 10)];
        case '-': {
          const delta = parseInt(data, 10);
          return [
            anchor > patchOffset ? anchor - delta : anchor,
            focus > patchOffset ? focus - delta : focus,
            patchOffset,
          ];
        }
        case '+': {
          const insertion = decodeURIComponent(data);
          const delta = insertion.length;
          return [
            anchor > patchOffset ? anchor + delta : anchor,
            focus > patchOffset ? focus + delta : focus,
            patchOffset,
          ];
        }
        default:
          return offsets;
      }
    },
    [start, end, 0]
  );

  return [nextStart, nextEnd];
}
