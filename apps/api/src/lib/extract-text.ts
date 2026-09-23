import { Buffer } from 'node:buffer'
import { PDFParse } from 'pdf-parse'

/** Pull plain text out of an uploaded knowledge file. */
export async function extractTextFromBuffer(buffer: Buffer, mimetype: string, filename: string): Promise<string> {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''

  if (mimetype === 'application/pdf' || ext === 'pdf') {
    return extractPdfText(buffer)
  }

  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimetype === 'application/msword' ||
    ext === 'docx' || ext === 'doc'
  ) {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  return buffer.toString('utf-8')
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer })
  try {
    const result = await parser.getText({ pageJoiner: '' })
    return result.text
  } finally {
    await parser.destroy().catch(() => undefined)
  }
}
