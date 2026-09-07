import {
  getReferenceLabel,
  getReferenceToken,
  MENTION_KIND_IMAGE,
  MENTION_KIND_VIDEO,
  parsePromptSegments,
} from './referencePrompt';

function appendTextWithBreaks(parent, text) {
  const parts = String(text || '').split('\n');
  parts.forEach((part, partIndex) => {
    if (part) {
      parent.appendChild(document.createTextNode(part));
    }
    if (partIndex < parts.length - 1) {
      parent.appendChild(document.createElement('br'));
    }
  });
}

function resolveMentionPreview(kind, index, imageReferences, videoReferences, resolveImagePreview, resolveVideoPreview) {
  if (kind === MENTION_KIND_VIDEO) {
    const reference = videoReferences[index];
    return {
      reference,
      previewUrl: reference ? resolveVideoPreview?.(reference, index) || '' : '',
    };
  }
  const reference = imageReferences[index];
  return {
    reference,
    previewUrl: reference ? resolveImagePreview?.(reference, index) || '' : '',
  };
}

export function createMentionChipElement(
  kind,
  index,
  imageReferences = [],
  videoReferences = [],
  resolveImagePreview,
  resolveVideoPreview
) {
  const mentionKind = kind === MENTION_KIND_VIDEO ? MENTION_KIND_VIDEO : MENTION_KIND_IMAGE;
  const { reference, previewUrl } = resolveMentionPreview(
    mentionKind,
    index,
    imageReferences,
    videoReferences,
    resolveImagePreview,
    resolveVideoPreview
  );
  const label = getReferenceLabel(index, mentionKind);
  const token = getReferenceToken(index, mentionKind);

  const chip = document.createElement('span');
  chip.className =
    `reference-prompt-preview-mention ${mentionKind === MENTION_KIND_VIDEO ? 'is-video' : ''} ${
      reference ? '' : 'is-missing'
    }`.trim();
  chip.contentEditable = 'false';
  chip.dataset.mentionKind = mentionKind;
  chip.dataset.mentionIndex = String(index);
  chip.title = reference ? label : `${token} 无对应参考${mentionKind === MENTION_KIND_VIDEO ? '视频' : '图'}`;

  if (previewUrl && mentionKind === MENTION_KIND_VIDEO) {
    const video = document.createElement('video');
    video.src = previewUrl;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.className = 'reference-prompt-preview-mention-thumb';
    chip.appendChild(video);
  } else if (previewUrl) {
    const image = document.createElement('img');
    image.src = previewUrl;
    image.alt = label;
    image.className = 'reference-prompt-preview-mention-thumb';
    chip.appendChild(image);
  } else {
    const placeholder = document.createElement('span');
    placeholder.className =
      'reference-prompt-preview-mention-thumb reference-prompt-preview-mention-thumb-empty';
    placeholder.textContent = String(index + 1);
    chip.appendChild(placeholder);
  }

  const tokenLabel = document.createElement('span');
  tokenLabel.className = 'reference-prompt-preview-mention-token';
  tokenLabel.textContent = token;
  chip.appendChild(tokenLabel);

  return chip;
}

export function renderReferencePromptEditor(
  root,
  plainText,
  imageReferences = [],
  resolveImagePreview,
  videoReferences = [],
  resolveVideoPreview
) {
  if (!root) return;

  // Backward-compatible signature: (root, text, refs, resolvePreview)
  // New signature also accepts video refs as 5th/6th args.
  root.innerHTML = '';
  const segments = parsePromptSegments(plainText);
  if (segments.length === 0) {
    if (plainText) {
      appendTextWithBreaks(root, plainText);
    }
    return;
  }

  segments.forEach((segment) => {
    if (segment.type === 'text') {
      appendTextWithBreaks(root, segment.value);
      return;
    }
    root.appendChild(
      createMentionChipElement(
        segment.kind || MENTION_KIND_IMAGE,
        segment.index,
        imageReferences,
        videoReferences,
        resolveImagePreview,
        resolveVideoPreview
      )
    );
  });
}

function mentionTokenFromNode(node) {
  const kind =
    node.dataset?.mentionKind === MENTION_KIND_VIDEO ? MENTION_KIND_VIDEO : MENTION_KIND_IMAGE;
  return getReferenceToken(Number(node.dataset.mentionIndex), kind);
}

export function serializeReferencePromptEditor(root) {
  if (!root) return '';

  let result = '';

  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent || '';
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    if (node.dataset?.mentionIndex != null) {
      result += mentionTokenFromNode(node);
      return;
    }

    if (node.tagName === 'BR') {
      result += '\n';
      return;
    }

    node.childNodes.forEach(walk);
  }

  root.childNodes.forEach(walk);
  return result;
}

export function getReferencePromptCursorOffset(root) {
  const selection = window.getSelection();
  if (!root || !selection || selection.rangeCount === 0) return 0;

  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer)) return 0;

  const preRange = range.cloneRange();
  preRange.selectNodeContents(root);
  preRange.setEnd(range.startContainer, range.startOffset);

  const container = document.createElement('div');
  container.appendChild(preRange.cloneContents());
  return serializeReferencePromptEditor(container).length;
}

export function restoreReferencePromptCursor(root, offset) {
  const selection = window.getSelection();
  if (!root || !selection) return;

  const range = document.createRange();
  let remaining = Math.max(0, offset);
  let found = false;

  function walk(node) {
    if (found) return;

    if (node.nodeType === Node.TEXT_NODE) {
      const length = node.textContent?.length || 0;
      if (remaining <= length) {
        range.setStart(node, remaining);
        range.collapse(true);
        found = true;
        return;
      }
      remaining -= length;
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    if (node.dataset?.mentionIndex != null) {
      const token = mentionTokenFromNode(node);
      if (remaining <= token.length) {
        if (remaining === 0) {
          range.setStartBefore(node);
        } else {
          range.setStartAfter(node);
        }
        range.collapse(true);
        found = true;
        return;
      }
      remaining -= token.length;
      return;
    }

    if (node.tagName === 'BR') {
      if (remaining <= 1) {
        range.setStartBefore(node);
        range.collapse(true);
        found = true;
        return;
      }
      remaining -= 1;
      return;
    }

    node.childNodes.forEach(walk);
  }

  root.childNodes.forEach(walk);

  if (!found) {
    range.selectNodeContents(root);
    range.collapse(false);
  }

  selection.removeAllRanges();
  selection.addRange(range);
}
