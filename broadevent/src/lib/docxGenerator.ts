// src/lib/docxGenerator.ts
import {
  Document, Packer, Paragraph, TextRun,
  HeadingLevel, AlignmentType, BorderStyle, LevelFormat, WidthType,
  TableRow, TableCell, Table, ShadingType, VerticalAlign,
} from 'docx'
import { saveAs } from 'file-saver'

export interface ReportConfig {
  title:            string
  content:          string
  titleFontSize:    number
  subtitleFontSize: number
  bodyFontSize:     number
}

const hp = (pt: number) => pt * 2  // pt → half-point

function lines(content: string, body: number, sub: number): Paragraph[] {
  const result: Paragraph[] = []
  for (const raw of content.split('\n')) {
    const line = raw.trimEnd()
    if (line.startsWith('### ')) {
      result.push(new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 180, after: 80 },
        children: [new TextRun({ text: line.slice(4), bold: true, size: hp(sub - 1), font: 'Malgun Gothic' })],
      }))
    } else if (line.startsWith('## ')) {
      result.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 100 },
        children: [new TextRun({ text: line.slice(3), bold: true, size: hp(sub), font: 'Malgun Gothic', color: '2B5EA7' })],
      }))
    } else if (line.startsWith('# ')) {
      result.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300, after: 120 },
        children: [new TextRun({ text: line.slice(2), bold: true, size: hp(sub + 2), font: 'Malgun Gothic', color: '1F3864' })],
      }))
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      result.push(new Paragraph({
        numbering: { reference: 'bullets', level: 0 },
        spacing: { before: 60, after: 60 },
        children: [new TextRun({ text: line.slice(2), size: hp(body), font: 'Malgun Gothic' })],
      }))
    } else if (line.trim() === '') {
      result.push(new Paragraph({ spacing: { before: 60, after: 60 }, children: [new TextRun('')] }))
    } else {
      result.push(new Paragraph({
        spacing: { before: 80, after: 80 },
        children: [new TextRun({ text: line, size: hp(body), font: 'Malgun Gothic' })],
      }))
    }
  }
  return result
}

function metaRow(label: string, value: string): TableRow {
  const mkCell = (text: string, shade?: string) => new TableCell({
    ...(shade ? { shading: { fill: shade, type: ShadingType.CLEAR } } : {}),
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 140, right: 140 },
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      left:   { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      right:  { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    },
    children: [new Paragraph({
      children: [new TextRun({ text, size: 18, font: 'Malgun Gothic', bold: !!shade })],
    })],
  })
  return new TableRow({ children: [mkCell(label, 'D9E2F3'), mkCell(value)] })
}

export async function generateAndDownloadReport(config: ReportConfig): Promise<void> {
  const { title, content, titleFontSize: tfs, subtitleFontSize: sfs, bodyFontSize: bfs } = config

  const doc = new Document({
    numbering: {
      config: [{
        reference: 'bullets',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 480, hanging: 260 } } },
        }],
      }],
    },
    styles: {
      default: { document: { run: { font: 'Malgun Gothic', size: hp(bfs) } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: hp(tfs), bold: true, font: 'Malgun Gothic', color: '1F3864' },
          paragraph: { spacing: { before: 300, after: 120 }, outlineLevel: 0 } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: hp(sfs), bold: true, font: 'Malgun Gothic', color: '2B5EA7' },
          paragraph: { spacing: { before: 240, after: 100 }, outlineLevel: 1 } },
        { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: hp(sfs - 1), bold: true, font: 'Malgun Gothic', color: '17375E' },
          paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 2 } },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },       // A4
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1800 },  // 여백
        },
      },
      children: [
        // 제목
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 800, after: 200 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '2B5EA7', space: 1 } },
          children: [new TextRun({ text: title, bold: true, size: hp(tfs), font: 'Malgun Gothic', color: '1F3864' })],
        }),
        // 생성 날짜
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 100, after: 500 },
          children: [new TextRun({
            text: `작성일: ${new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}`,
            size: hp(bfs - 1), font: 'Malgun Gothic', color: '888888',
          })],
        }),
        // 메타 정보 표
        new Table({
          width: { size: 7000, type: WidthType.DXA },
          columnWidths: [2800, 4200],
          rows: [
            metaRow('보고서 유형', title.includes('세미나') ? '세미나 결과 보고서' : '전시회 결과 보고서'),
            metaRow('문서 상태',   '내부 기밀 문서'),
            metaRow('작성 시스템', '방송 행사 자동 알리미'),
          ],
        }),
        new Paragraph({ spacing: { before: 400, after: 0 }, children: [new TextRun('')] }),
        // 본문
        ...lines(content, bfs, sfs),
      ],
    }],
  })

  const blob = await Packer.toBlob(doc)
  const safeName = title.replace(/[^\w가-힣\s\-]/g, '').slice(0, 60).trim().replace(/\s+/g, '_')
  saveAs(blob, `${safeName}.docx`)
}
