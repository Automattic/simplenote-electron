import {
  HEADING,
  INLINE_CODE,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  HIGHLIGHT,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  LINK,
  QUOTE,
  STRIKETHROUGH,
  type TextFormatTransformer,
  type TextMatchTransformer,
  type Transformer,
} from '@lexical/markdown';

import {
  HR,
  IMAGE,
  SELECTION_AWARE_CODE,
  TABLE,
  TILDE_CODE,
} from './gfm-transformers';
import {
  MIXED_NESTED_CHECK_LIST,
  MIXED_NESTED_ORDERED_LIST,
  MIXED_NESTED_UNORDERED_LIST,
} from './list-transformers';

export const MARKDOWN_TRANSFORMERS: Array<Transformer> = [
  HEADING,
  QUOTE,
  HR,
  MIXED_NESTED_CHECK_LIST,
  MIXED_NESTED_UNORDERED_LIST,
  MIXED_NESTED_ORDERED_LIST,
  TABLE,
  SELECTION_AWARE_CODE,
  TILDE_CODE,
  INLINE_CODE,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  HIGHLIGHT,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  STRIKETHROUGH,
  IMAGE,
  LINK,
];

export const TRANSFORMERS = MARKDOWN_TRANSFORMERS;

export const INLINE_MARKDOWN_TRANSFORMERS = MARKDOWN_TRANSFORMERS.filter(
  (transformer): transformer is TextFormatTransformer | TextMatchTransformer =>
    transformer.type === 'text-format' || transformer.type === 'text-match'
);
