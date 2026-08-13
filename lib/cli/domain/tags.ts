// Tag normalization shared by `create --tags=` and `add --file=`.
//
// Tags are user input at a system boundary. A tag carrying whitespace or a
// comma is rejected outright: the `tag:` query's pattern is `[^\s,]+`, which
// can never match such a tag, so it would be created and then be
// un-searchable forever. This also matches the desktop app, where whitespace
// and commas are tag *separators* and the importer strips them — a value like
// `a b` cannot exist as one tag there. (A line break additionally breaks the
// exported markdown by injecting a new line into the `Tags:` block.) All of
// these are a usage error, not data. Duplicates are dropped so `--tags=a,a`
// is the same note as `--tags=a` and the dedup fingerprint cannot tell them
// apart.
import { UsageError } from './errors.ts';

const INVALID = /[\s,]/;

export function normalizeTags(
  tags: readonly string[],
  where: string
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  tags.forEach((raw, index) => {
    // NFC-normalized so a tag created on macOS (NFD) and one typed on
    // Windows/Linux (NFC) are the same tag: the dedup fingerprint in add.ts
    // and the tag: search both normalize, so the stored value must too.
    const tag = raw.trim().normalize('NFC');
    if (tag.length === 0) {
      return;
    }
    if (INVALID.test(tag)) {
      throw new UsageError(
        `Tag ${index + 1} for ${where} contains whitespace or a comma`
      );
    }
    if (seen.has(tag)) {
      return;
    }
    seen.add(tag);
    result.push(tag);
  });
  return result;
}
