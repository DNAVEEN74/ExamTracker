import { supabaseAdmin } from '@/lib/supabase/admin'

// pdf-parse requires CJS dynamic import in Next.js
async function getPdfParse() {
    const mod = await import('pdf-parse' as any)
    return mod.default ?? mod
}

export interface PdfExtractionResult {
    text: string
    pageCount: number
    isTextBased: boolean   // false = scanned image, needs OCR
    fileSizeBytes: number
    metadata?: {
        title?: string
        author?: string
        creationDate?: string
    }
}

/** Download PDF buffer from Supabase Storage */
export async function downloadPdfFromStorage(storagePath: string): Promise<Buffer> {
    const { data, error } = await supabaseAdmin.storage
        .from('raw-pdfs')
        .download(storagePath)

    if (error) throw new Error(`Failed to download PDF from Storage: ${error.message}`)
    if (!data) throw new Error('Storage returned empty response')

    const arrayBuffer = await data.arrayBuffer()
    return Buffer.from(arrayBuffer)
}

/** Extract text + metadata from a PDF buffer using pdf-parse */
export async function extractTextFromPdf(pdfBuffer: Buffer): Promise<PdfExtractionResult> {
    const pdfParse = await getPdfParse()

    let result: PdfExtractionResult = {
        text: '',
        pageCount: 0,
        isTextBased: false,
        fileSizeBytes: pdfBuffer.length,
    }

    try {
        const parsed = await pdfParse(pdfBuffer, {
            // Don't render to canvas — we only need text in server env
            max: 0,
        })

        const rawText = parsed.text ?? ''
        // Clean up common PDF extraction artifacts
        const cleanedText = rawText
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\f/g, '\n')          // form feeds = page breaks
            .replace(/\t/g, ' ')
            .replace(/ {3,}/g, '  ')       // collapse excessive spaces
            .replace(/\n{4,}/g, '\n\n\n') // max 3 blank lines
            .trim()

        result = {
            text: cleanedText,
            pageCount: parsed.numpages ?? 0,
            isTextBased: cleanedText.length > 200, // <200 chars on any page = likely scanned
            fileSizeBytes: pdfBuffer.length,
            metadata: {
                title: parsed.info?.Title ?? undefined,
                author: parsed.info?.Author ?? undefined,
                creationDate: parsed.info?.CreationDate ?? undefined,
            },
        }
    } catch (err) {
        // pdf-parse can throw on corrupt PDFs — return empty result
        console.warn('pdf-parse error (may be scanned/corrupt):', (err as Error).message)
        result.text = ''
        result.isTextBased = false
        result.pageCount = 0
    }

    return result
}

/** Delete PDF from Supabase Storage (call after successful parsing) */
export async function deletePdfFromStorage(storagePath: string): Promise<boolean> {
    const { error } = await supabaseAdmin.storage
        .from('raw-pdfs')
        .remove([storagePath])

    if (error) {
        console.error(`Failed to delete PDF from Storage (${storagePath}):`, error.message)
        return false
    }
    return true
}

/** Update the pdf_ingestion_log row status */
export async function updateIngestionStatus(
    ingestionLogId: string,
    status: 'DONE' | 'FAILED' | 'SKIPPED',
    details?: Record<string, unknown>
) {
    const { error } = await supabaseAdmin
        .from('pdf_ingestion_log')
        .update({
            status,
            processed_at: new Date().toISOString(),
            ...details,
        })
        .eq('id', ingestionLogId)

    if (error) console.error('Failed to update ingestion log:', error.message)
}
