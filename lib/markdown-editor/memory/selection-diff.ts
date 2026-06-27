// Character-level diff for remapping caret offsets when markdown changes
// between capture and restore (remote sync).

export type MarkdownSelectionOffsets = {
  anchor: number;
  focus: number;
  direction: 'LTR' | 'RTL';
};

type DiffOp =
  | { kind: 'equal'; length: number }
  | { kind: 'delete'; length: number }
  | { kind: 'insert'; text: string };

const MAX_LCS_CHARS = 4096;

function diffMiddle(local: string, remote: string): DiffOp[] {
  if (local === remote) {
    return [];
  }
  if (local.length === 0) {
    return [{ kind: 'insert', text: remote }];
  }
  if (remote.length === 0) {
    return [{ kind: 'delete', length: local.length }];
  }
  if (remote.endsWith(local)) {
    const inserted = remote.slice(0, remote.length - local.length);
    return inserted.length > 0
      ? [
          { kind: 'insert', text: inserted },
          { kind: 'equal', length: local.length },
        ]
      : [{ kind: 'equal', length: local.length }];
  }
  if (local.endsWith(remote)) {
    const removed = local.slice(0, local.length - remote.length);
    return removed.length > 0
      ? [
          { kind: 'delete', length: removed.length },
          { kind: 'equal', length: remote.length },
        ]
      : [{ kind: 'equal', length: remote.length }];
  }
  if (local.length + remote.length <= MAX_LCS_CHARS) {
    return lcsDiffOps(local, remote);
  }

  return [
    { kind: 'delete', length: local.length },
    { kind: 'insert', text: remote },
  ];
}

function lcsDiffOps(local: string, remote: string): DiffOp[] {
  const rows = local.length + 1;
  const cols = remote.length + 1;
  const dp = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      dp[i][j] =
        local[i - 1] === remote[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const ops: DiffOp[] = [];
  let i = local.length;
  let j = remote.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && local[i - 1] === remote[j - 1]) {
      let length = 0;
      while (i > 0 && j > 0 && local[i - 1] === remote[j - 1]) {
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
        if (i > 0 && local[i - 1] === remote[j - 1]) {
          break;
        }
        text = remote[j - 1] + text;
        j--;
      }
      ops.push({ kind: 'insert', text });
      continue;
    }

    let length = 0;
    while (i > 0 && (j === 0 || dp[i - 1][j] >= dp[i][j - 1])) {
      if (j > 0 && local[i - 1] === remote[j - 1]) {
        break;
      }
      length++;
      i--;
    }
    ops.push({ kind: 'delete', length });
  }

  return mergeDiffOps(ops.reverse());
}

function mergeDiffOps(ops: DiffOp[]): DiffOp[] {
  const merged: DiffOp[] = [];
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

export function diffMarkdownToOps(local: string, remote: string): DiffOp[] {
  if (local === remote) {
    return [];
  }

  let prefix = 0;
  while (
    prefix < local.length &&
    prefix < remote.length &&
    local[prefix] === remote[prefix]
  ) {
    prefix++;
  }

  let suffix = 0;
  while (
    suffix < local.length - prefix &&
    suffix < remote.length - prefix &&
    local[local.length - 1 - suffix] === remote[remote.length - 1 - suffix]
  ) {
    suffix++;
  }

  const ops: DiffOp[] = [];
  if (prefix > 0) {
    ops.push({ kind: 'equal', length: prefix });
  }

  const localMiddle = local.slice(prefix, local.length - suffix);
  const remoteMiddle = remote.slice(prefix, remote.length - suffix);
  ops.push(...diffMiddle(localMiddle, remoteMiddle));

  if (suffix > 0) {
    ops.push({ kind: 'equal', length: suffix });
  }

  return mergeDiffOps(ops);
}

export function remapMarkdownOffset(
  local: string,
  remote: string,
  offset: number
): number {
  if (local === remote) {
    return offset;
  }

  const target = Math.max(0, Math.min(offset, local.length));
  const ops = diffMarkdownToOps(local, remote);
  let localIndex = 0;
  let remoteIndex = 0;

  for (const op of ops) {
    switch (op.kind) {
      case 'equal': {
        if (target <= localIndex + op.length) {
          return remoteIndex + (target - localIndex);
        }
        localIndex += op.length;
        remoteIndex += op.length;
        break;
      }
      case 'delete': {
        if (target <= localIndex + op.length) {
          return remoteIndex;
        }
        localIndex += op.length;
        break;
      }
      case 'insert': {
        remoteIndex += op.text.length;
        break;
      }
    }
  }

  return remoteIndex;
}

export function remapMarkdownSelectionOffsets(
  local: string,
  remote: string,
  saved: MarkdownSelectionOffsets
): MarkdownSelectionOffsets {
  return {
    anchor: remapMarkdownOffset(local, remote, saved.anchor),
    focus: remapMarkdownOffset(local, remote, saved.focus),
    direction: saved.direction,
  };
}
