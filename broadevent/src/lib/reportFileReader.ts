function readUInt16(view: DataView, offset: number): number {
  return view.getUint16(offset, true)
}

function readUInt32(view: DataView, offset: number): number {
  return view.getUint32(offset, true)
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (!('DecompressionStream' in window)) {
    throw new Error('이 브라우저에서는 .docx 압축 해제를 지원하지 않습니다.')
  }

  const chunk = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
  const stream = new Blob([chunk]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

function decodeXmlText(xml: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, 'application/xml')
  const paragraphs = Array.from(doc.getElementsByTagName('w:p'))

  if (!paragraphs.length) {
    return xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  }

  return paragraphs
    .map((p) => Array.from(p.getElementsByTagName('w:t')).map((t) => t.textContent || '').join(''))
    .filter((line) => line.trim())
    .join('\n')
}

async function readDocx(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  let eocd = -1
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (readUInt32(view, i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('.docx 중앙 디렉터리를 찾을 수 없습니다.')

  const centralDirectorySize = readUInt32(view, eocd + 12)
  const centralDirectoryOffset = readUInt32(view, eocd + 16)
  const decoder = new TextDecoder()
  let offset = centralDirectoryOffset
  const end = centralDirectoryOffset + centralDirectorySize

  while (offset < end && readUInt32(view, offset) === 0x02014b50) {
    const compressionMethod = readUInt16(view, offset + 10)
    const compressedSize = readUInt32(view, offset + 20)
    const fileNameLength = readUInt16(view, offset + 28)
    const extraLength = readUInt16(view, offset + 30)
    const commentLength = readUInt16(view, offset + 32)
    const localHeaderOffset = readUInt32(view, offset + 42)
    const fileName = decoder.decode(bytes.slice(offset + 46, offset + 46 + fileNameLength))

    if (fileName === 'word/document.xml') {
      const localFileNameLength = readUInt16(view, localHeaderOffset + 26)
      const localExtraLength = readUInt16(view, localHeaderOffset + 28)
      const dataStart = localHeaderOffset + 30 + localFileNameLength + localExtraLength
      const compressed = bytes.slice(dataStart, dataStart + compressedSize)
      const xmlBytes = compressionMethod === 0 ? compressed : await inflateRaw(compressed)
      const text = decodeXmlText(decoder.decode(xmlBytes)).trim()
      if (!text) throw new Error('.docx에서 읽을 수 있는 본문이 없습니다.')
      return text
    }

    offset += 46 + fileNameLength + extraLength + commentLength
  }

  throw new Error('.docx 본문 파일을 찾을 수 없습니다.')
}

export async function readReportFile(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase()

  if (extension === 'docx') return readDocx(file)
  if (extension === 'txt' || extension === 'md' || extension === 'markdown' || extension === 'html') {
    return (await file.text()).trim()
  }

  throw new Error('지원 파일 형식은 .docx, .txt, .md, .html입니다.')
}
