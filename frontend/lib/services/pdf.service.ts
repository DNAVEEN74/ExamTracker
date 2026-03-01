import { supabaseAdmin } from '@/lib/supabase/admin'

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

/** Delete PDF from Supabase Storage after successful parsing */
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
