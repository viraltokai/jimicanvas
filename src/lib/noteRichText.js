/**
 * 文本节点的行内标记：***加粗斜体***、**加粗**、*斜体*。
 * 内容仍然是纯字符串，只在渲染时解析，云端存储与 AI 输入输出都不受影响。
 * 标记不跨行，且 `* ` 这种列表写法不会被当成斜体。
 */
const INLINE_PATTERN = /\*\*\*(?!\s)([^*\n]+?)\*\*\*|\*\*(?!\s)([^*\n]+?)\*\*|\*(?!\s)([^*\n]+?)\*/g;

export const BOLD_MARK = '**';
export const ITALIC_MARK = '*';

/** 拆成 { text, bold, italic } 片段，供渲染层使用 */
export function parseNoteRichText(text) {
  const source = String(text ?? '');
  if (!source) return [];

  const segments = [];
  let lastIndex = 0;
  let match;

  INLINE_PATTERN.lastIndex = 0;
  while ((match = INLINE_PATTERN.exec(source)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: source.slice(lastIndex, match.index) });
    }

    if (match[1] !== undefined) {
      segments.push({ text: match[1], bold: true, italic: true });
    } else if (match[2] !== undefined) {
      segments.push({ text: match[2], bold: true });
    } else {
      segments.push({ text: match[3], italic: true });
    }

    lastIndex = INLINE_PATTERN.lastIndex;
  }

  if (lastIndex < source.length) {
    segments.push({ text: source.slice(lastIndex) });
  }

  return segments;
}

function isWrappedInside(inside, mark) {
  if (inside.length < mark.length * 2) return false;
  if (!inside.startsWith(mark) || !inside.endsWith(mark)) return false;
  // 选中 **加粗** 时不要误判成斜体
  if (mark === ITALIC_MARK && inside.startsWith(BOLD_MARK) && inside.endsWith(BOLD_MARK)) {
    return false;
  }
  return true;
}

function isWrappedOutside(source, start, end, mark) {
  const before = source.slice(Math.max(0, start - mark.length), start);
  const after = source.slice(end, end + mark.length);
  if (before !== mark || after !== mark) return false;

  if (mark === ITALIC_MARK) {
    const before2 = source.slice(Math.max(0, start - BOLD_MARK.length), start);
    const after2 = source.slice(end, end + BOLD_MARK.length);
    if (before2 === BOLD_MARK && after2 === BOLD_MARK) return false;
  }
  return true;
}

/** 选区当前是否已经被某个标记包住（选区内侧或外侧都算） */
export function isSelectionMarked(value, start, end, mark) {
  if (start === end) return false;
  const source = String(value ?? '');
  return isWrappedInside(source.slice(start, end), mark) || isWrappedOutside(source, start, end, mark);
}

/** 给选区加上/去掉标记，返回新文本与新的选区位置 */
export function toggleInlineMark(value, start, end, mark) {
  const source = String(value ?? '');
  const inside = source.slice(start, end);
  const markLength = mark.length;

  if (isWrappedInside(inside, mark)) {
    const stripped = inside.slice(markLength, inside.length - markLength);
    return {
      value: source.slice(0, start) + stripped + source.slice(end),
      start,
      end: start + stripped.length,
    };
  }

  if (isWrappedOutside(source, start, end, mark)) {
    return {
      value: source.slice(0, start - markLength) + inside + source.slice(end + markLength),
      start: start - markLength,
      end: end - markLength,
    };
  }

  return {
    value: `${source.slice(0, start)}${mark}${inside}${mark}${source.slice(end)}`,
    start: start + markLength,
    end: end + markLength,
  };
}
