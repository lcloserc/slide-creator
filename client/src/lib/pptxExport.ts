import PptxGenJS from 'pptxgenjs';
import type { PresentationData, Block, Theme } from '../types';

function hexToRgb(hex: string): string {
  return hex.replace('#', '');
}

function parseInlineFormatting(text: string): PptxGenJS.TextProps[] {
  const parts: PptxGenJS.TextProps[] = [];
  const regex = /(<b>|<\/b>|<i>|<\/i>|<strong>|<\/strong>|<em>|<\/em>)/gi;
  let bold = false;
  let italic = false;
  let lastIndex = 0;

  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        text: text.substring(lastIndex, match.index),
        options: { bold, italic },
      });
    }
    const tag = match[0].toLowerCase();
    if (tag === '<b>' || tag === '<strong>') bold = true;
    else if (tag === '</b>' || tag === '</strong>') bold = false;
    else if (tag === '<i>' || tag === '<em>') italic = true;
    else if (tag === '</i>' || tag === '</em>') italic = false;
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.substring(lastIndex), options: { bold, italic } });
  }

  if (parts.length === 0) {
    parts.push({ text, options: {} });
  }

  return parts;
}

export function exportToPptx(data: PresentationData, filename: string) {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'CUSTOM', width: 13.333, height: 7.5 });
  pptx.layout = 'CUSTOM';
  pptx.title = data.title;

  const theme = data.theme;

  for (const slide of data.slides) {
    const pptxSlide = pptx.addSlide();
    pptxSlide.background = { color: hexToRgb(theme.backgroundColor) };

    let yPos = 0.5;

    pptxSlide.addText(slide.title, {
      x: 0.75,
      y: yPos,
      w: 11.83,
      h: 0.8,
      fontSize: 30,
      fontFace: theme.fontFamily || 'Arial',
      color: hexToRgb(theme.titleColor),
      bold: true,
      valign: 'top',
    });

    yPos += 1.0;

    for (const block of slide.blocks) {
      yPos = renderBlockToPptx(pptxSlide, block, theme, yPos);
    }

    if (slide.notes) {
      pptxSlide.addNotes(slide.notes);
    }
  }

  pptx.writeFile({ fileName: `${filename.replace(/\.pptx$/i, '')}.pptx` });
}

function renderBlockToPptx(
  pptxSlide: PptxGenJS.Slide,
  block: Block,
  theme: Theme,
  yPos: number
): number {
  const baseOpts = {
    x: 0.75,
    w: 11.83,
    fontFace: theme.fontFamily || 'Arial',
    color: hexToRgb(theme.textColor),
    fontSize: 16,
    valign: 'top' as const,
  };

  switch (block.type) {
    case 'text': {
      const runs = parseInlineFormatting(block.content);
      const lineCount = Math.max(1, Math.ceil(block.content.length / 100));
      const h = lineCount * 0.4;
      pptxSlide.addText(runs, { ...baseOpts, y: yPos, h });
      return yPos + h + 0.15;
    }

    case 'bullets': {
      const items = block.items.map((item) => ({
        text: item,
        options: {
          bullet: true as const,
          color: hexToRgb(theme.textColor),
          fontSize: 16,
        },
      }));
      const h = items.length * 0.35 + 0.1;
      pptxSlide.addText(items, { ...baseOpts, y: yPos, h });
      return yPos + h + 0.15;
    }

    case 'numbered': {
      const items = block.items.map((item) => ({
        text: item,
        options: {
          bullet: { type: 'number' as const },
          color: hexToRgb(theme.textColor),
          fontSize: 16,
        },
      }));
      const h = items.length * 0.35 + 0.1;
      pptxSlide.addText(items, { ...baseOpts, y: yPos, h });
      return yPos + h + 0.15;
    }

    case 'table': {
      const headerRow = block.headers.map((h) => ({
        text: h,
        options: {
          bold: true,
          color: 'FFFFFF',
          fill: { color: hexToRgb(theme.accentColor) },
          fontSize: 14,
          fontFace: theme.fontFamily || 'Arial',
        },
      }));

      const dataRows = block.rows.map((row) =>
        row.map((cell) => ({
          text: cell,
          options: {
            color: hexToRgb(theme.textColor),
            fontSize: 14,
            fontFace: theme.fontFamily || 'Arial',
          },
        }))
      );

      const tableData = [headerRow, ...dataRows];
      const h = tableData.length * 0.4 + 0.1;

      pptxSlide.addTable(tableData as any, {
        x: 0.75,
        y: yPos,
        w: 11.83,
        border: { pt: 1, color: 'CCCCCC' },
        colW: Array(block.headers.length).fill(11.83 / block.headers.length),
      });

      return yPos + h + 0.15;
    }

    case 'quote': {
      const lineCount = Math.max(1, Math.ceil(block.content.length / 100));
      const h = lineCount * 0.4 + 0.3;
      pptxSlide.addText(block.content, {
        ...baseOpts,
        y: yPos,
        h,
        italic: true,
        fill: {
          color: theme.backgroundColor === '#FFFFFF' || theme.backgroundColor === '#FFF8F0'
            ? 'F5F5F5'
            : '1A1A2E',
        },
      });
      return yPos + h + 0.15;
    }

    default:
      return yPos;
  }
}
