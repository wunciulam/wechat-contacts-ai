import { formatChatLines, mergeTranscriptPages, type OCRLine } from './chatTranscript';

const TILE_HEIGHT = 1750;
const TILE_OVERLAP = 180;

function isGreenBubble(ctx: CanvasRenderingContext2D, { x0, x1, y0 }: OCRLine['bbox']) {
  const x = Math.max(0, x0);
  const width = Math.max(0, Math.min(ctx.canvas.width, x1) - x);
  if (width < 8 || y0 < 4) return false;
  const { data } = ctx.getImageData(x, y0 - 3, width, 1);
  let hits = 0;
  for (let i = 0; i < data.length; i += 16) {
    if (data[i + 1] > data[i] + 28 && data[i + 1] > data[i + 2] + 28) hits++;
  }
  return hits >= width / 8;
}

export async function recognizeChatScreenshots(
  files: File[],
  onProgress: (message: string) => void,
  signal: AbortSignal,
): Promise<{ text: string; unreadable: number }> {
  const [{ createWorker, OEM, PSM }, { default: workerPath }, { default: corePath }, { default: chinese }] = await Promise.all([
    import('tesseract.js'),
    import('../node_modules/tesseract.js/dist/worker.min.js?url'),
    import('../node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js?url'),
    import('../node_modules/@tesseract.js-data/chi_sim/4.0.0_best_int/chi_sim.traineddata.gz?url'),
  ]);
  signal.throwIfAborted();
  const langPath = new URL('.', new URL(chinese, window.location.href)).href;
  const worker = await createWorker('chi_sim', OEM.LSTM_ONLY, {
    workerPath, corePath, langPath, cacheMethod: 'none', errorHandler: () => {},
  });
  const cancel = () => { void worker.terminate(); };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    signal.throwIfAborted();
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
    const pages: string[][] = [];
    let unreadable = 0;
    for (const [index, file] of files.entries()) {
      signal.throwIfAborted();
      onProgress(`正在识别第 ${index + 1} / ${files.length} 张…`);
      let image: ImageBitmap;
      try { image = await createImageBitmap(file); }
      catch { unreadable++; continue; }
      try {
        const scale = Math.min(1.5, 1050 / image.width);
        const width = Math.round(image.width * scale);
        const height = Math.round(image.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
        if (!ctx) throw new Error('此浏览器无法识别截图。');
        const tiles: string[][] = [];
        for (let top = 0; top < height; top += TILE_HEIGHT - TILE_OVERLAP) {
          signal.throwIfAborted();
          canvas.height = Math.min(TILE_HEIGHT, height - top);
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, width, canvas.height);
          ctx.drawImage(image, 0, top / scale, image.width, canvas.height / scale, 0, 0, width, canvas.height);
          const { data } = await worker.recognize(canvas, {}, { blocks: true });
          const lines = (data.blocks || []).flatMap(block => block.paragraphs.flatMap(p => p.lines));
          // Divide the overlap in half so a line crossing a tile edge is read in the adjacent tile.
          const last = top + canvas.height >= height;
          const interior = lines.filter(line => {
            const middle = (line.bbox.y0 + line.bbox.y1) / 2;
            return (top === 0 || middle >= TILE_OVERLAP / 2) && (last || middle < canvas.height - TILE_OVERLAP / 2);
          });
          tiles.push(formatChatLines(interior.map(line => ({ ...line, ownBubble: isGreenBubble(ctx, line.bbox) })), width));
          if (last) break;
        }
        const page = tiles.flat();
        if (page.length) pages.push(page);
        else unreadable++;
      } finally {
        image.close();
      }
    }
    const text = mergeTranscriptPages(pages).join('\n');
    return { text, unreadable };
  } finally {
    signal.removeEventListener('abort', cancel);
    await worker.terminate();
  }
}
