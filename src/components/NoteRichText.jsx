import { Fragment } from 'react';
import { parseNoteRichText } from '../lib/noteRichText';

/** 把文本里的 **加粗** / *斜体* 标记渲染成行内样式 */
export function NoteRichText({ text }) {
  const segments = parseNoteRichText(text);

  return segments.map((segment, index) => {
    if (segment.bold && segment.italic) {
      return (
        <strong key={index}>
          <em>{segment.text}</em>
        </strong>
      );
    }
    if (segment.bold) return <strong key={index}>{segment.text}</strong>;
    if (segment.italic) return <em key={index}>{segment.text}</em>;
    return <Fragment key={index}>{segment.text}</Fragment>;
  });
}
