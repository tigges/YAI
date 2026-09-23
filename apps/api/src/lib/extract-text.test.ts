import assert from 'node:assert/strict'
import { test } from 'node:test'
import { extractTextFromBuffer } from './extract-text.js'

const samplePdf = Buffer.from(`%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 68>>stream
BT /F1 18 Tf 40 80 Td (Hello from a PDF source) Tj ET
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R>>
%%EOF
`)

test('a PDF source yields its text', async () => {
  const text = await extractTextFromBuffer(samplePdf, 'application/pdf', 'hours.pdf')
  assert.match(text, /Hello from a PDF source/)
})

test('a text file is kept as written', async () => {
  const text = await extractTextFromBuffer(Buffer.from('Salon hours 9 to 6'), 'text/plain', 'hours.txt')
  assert.equal(text, 'Salon hours 9 to 6')
})
