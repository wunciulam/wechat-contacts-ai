export interface OCRLine {
  text: string;
  ownBubble?: boolean;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export const MAX_TRANSCRIPT_LENGTH = 18000;

function comparable(line: string) {
  return line.normalize('NFKC').replace(/\s/g, '');
}

export function mergeTranscriptPages(pages: string[][]): string[] {
  const result: string[] = [];
  for (const page of pages) {
    if (!page.length) continue;
    const previous = result.map(comparable);
    const current = page.map(comparable);
    if (current.length === previous.length && current.every((line, i) => line === previous[i])) continue;
    let overlap = Math.min(previous.length, current.length);
    while (overlap > 0) {
      const start = previous.length - overlap;
      if (current.slice(0, overlap).every((line, i) => line === previous[start + i])) break;
      overlap--;
    }
    // A short phrase such as “好的” is common in unrelated consecutive messages.
    if (overlap === 1 && current[0].replace(/^[^：:]*[：:]/, '').length < 8) overlap = 0;
    result.push(...page.slice(overlap));
  }
  return result;
}

export function formatChatLines(lines: OCRLine[], width: number): string[] {
  return [...lines].sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0)
    .flatMap(({ text, bbox, ownBubble }) => {
      const value = text.trim().replace(/([\p{Script=Han}]) +(?=[\p{Script=Han}])/gu, '$1');
      if (!value) return [];
      const center = (bbox.x0 + bbox.x1) / (2 * width);
      const time = /^(?:(?:\d{2,4}[-年/.]\d{1,2}(?:[-月/.]\d{1,2}日?)?|昨天|今天|星期[一二三四五六日天]|周[一二三四五六日天])\s*)?(?:(?:上午|下午|晚上|凌晨|中午)\s*)?\d{1,2}[:：]\d{2}$/;
      if (center > .25 && center < .75 && (time.test(value) || /^(?:\d{4}[年\-/.]\d{1,2}[月\-/.]\d{1,2}日?|\d{1,2}月\d{1,2}日|今天|昨天|星期[一二三四五六日天])$/.test(value))) return [value];
      const left = bbox.x0 / width;
      const right = bbox.x1 / width;
      const speaker = ownBubble || left >= .42 || (right >= .72 && left > .22 && center > .57) ? '我'
        : left <= .28 && center < .54 ? '客户' : '待核对';
      return [speaker + '：' + value];
    });
}

export function transcriptLines(transcript: string) {
  return transcript.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
}
