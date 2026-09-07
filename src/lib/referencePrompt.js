export const MENTION_KIND_IMAGE = 'image';
export const MENTION_KIND_VIDEO = 'video';

export function getReferenceToken(index, kind = MENTION_KIND_IMAGE) {
  const n = Number(index) + 1;
  return kind === MENTION_KIND_VIDEO ? `@视频${n}` : `@图${n}`;
}

export function getReferenceLabel(index, kind = MENTION_KIND_IMAGE) {
  const n = Number(index) + 1;
  return kind === MENTION_KIND_VIDEO ? `视频${n}` : `图${n}`;
}

export function detectReferenceMention(text, cursor) {
  const before = String(text || '').slice(0, cursor);
  const match = before.match(/@([^\s@]*)$/);
  if (!match) return null;
  return {
    start: cursor - match[0].length,
    query: match[1],
  };
}

function matchesMentionQuery(item, normalizedQuery) {
  if (!normalizedQuery) return true;
  if (
    item.label.toLowerCase().includes(normalizedQuery) ||
    item.token.toLowerCase().includes(normalizedQuery) ||
    String(item.index + 1).includes(normalizedQuery)
  ) {
    return true;
  }
  if (item.kind === MENTION_KIND_VIDEO) {
    return '视频'.startsWith(normalizedQuery) || 'video'.startsWith(normalizedQuery);
  }
  return (
    '图'.startsWith(normalizedQuery) ||
    '图片'.startsWith(normalizedQuery) ||
    'image'.startsWith(normalizedQuery)
  );
}

export function filterReferenceMentionOptions(references, query, resolvePreviewUrl) {
  return buildReferenceMentionOptions({
    images: references,
    query,
    resolveImagePreview: resolvePreviewUrl,
  });
}

export function buildReferenceMentionOptions({
  images = [],
  videos = [],
  query = '',
  resolveImagePreview,
  resolveVideoPreview,
} = {}) {
  const normalizedQuery = String(query || '').toLowerCase();

  const imageOptions = (images || []).map((reference, index) => ({
    reference,
    kind: MENTION_KIND_IMAGE,
    index,
    label: getReferenceLabel(index, MENTION_KIND_IMAGE),
    token: getReferenceToken(index, MENTION_KIND_IMAGE),
    previewUrl: resolveImagePreview?.(reference, index) || '',
  }));

  const videoOptions = (videos || []).map((reference, index) => ({
    reference,
    kind: MENTION_KIND_VIDEO,
    index,
    label: getReferenceLabel(index, MENTION_KIND_VIDEO),
    token: getReferenceToken(index, MENTION_KIND_VIDEO),
    previewUrl: resolveVideoPreview?.(reference, index) || '',
  }));

  return [...imageOptions, ...videoOptions].filter((item) =>
    matchesMentionQuery(item, normalizedQuery)
  );
}

const REFERENCE_TOKEN_PATTERN = /@(图|视频)(\d+)/g;

export function parsePromptSegments(text) {
  const segments = [];
  const source = String(text || '');
  let lastIndex = 0;
  REFERENCE_TOKEN_PATTERN.lastIndex = 0;
  let match = REFERENCE_TOKEN_PATTERN.exec(source);

  while (match !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: source.slice(lastIndex, match.index) });
    }
    const kind = match[1] === '视频' ? MENTION_KIND_VIDEO : MENTION_KIND_IMAGE;
    segments.push({
      type: 'mention',
      kind,
      token: match[0],
      index: Number(match[2]) - 1,
    });
    lastIndex = match.index + match[0].length;
    match = REFERENCE_TOKEN_PATTERN.exec(source);
  }

  if (lastIndex < source.length) {
    segments.push({ type: 'text', value: source.slice(lastIndex) });
  }

  return segments;
}

export function promptHasReferenceMentions(text) {
  return /@(图|视频)\d+/.test(String(text || ''));
}
