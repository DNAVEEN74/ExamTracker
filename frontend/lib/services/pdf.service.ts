import { GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getR2Client } from '@/lib/r2'
import db from '@/lib/db'

/** Download PDF buffer from Cloudflare R2 Storage */
export async function downloadPdfFromStorage(storagePath: string): Promise<Buffer> {
    const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: storagePath,
    })

    try {
        const client = getR2Client()
        const response = await client.send(command)

        if (!response.Body) {
            throw new Error('Storage returned empty response')
        }

        // The AWS SDK returns a stream in Node.js, we need to convert it to a Buffer
        const stream = response.Body as unknown as NodeJS.ReadableStream
        const chunks: Buffer[] = []
        for await (const chunk of stream) {
            chunks.push(Buffer.from(chunk))
        }
        return Buffer.concat(chunks)
    } catch (error: any) {
        throw new Error(`Failed to download PDF from R2: ${error.message}`)
    }
}

/** Delete PDF from Cloudflare R2 Storage after successful parsing */
export async function deletePdfFromStorage(storagePath: string): Promise<boolean> {
    const command = new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: storagePath,
    })

    try {
        const client = getR2Client()
        await client.send(command)
        return true
    } catch (error: any) {
        console.error(`Failed to delete PDF from R2 (${storagePath}):`, error.message)
        return false
    }
}

/** Update the pdf_ingestion_log row status in Prisma */
export async function updateIngestionStatus(
    ingestionLogId: string,
    status: 'DONE' | 'FAILED' | 'SKIPPED',
    details?: Record<string, unknown>
) {
    try {
        await db.pdfIngestionLog.update({
            where: { id: ingestionLogId },
            data: {
                ai_status: status,
                ai_error: details?.error ? String(details.error) : null,
                exam_id: details?.exam_id ? String(details.exam_id) : null,
                processing_time: details?.processing_time ? Number(details.processing_time) : null,
            },
        })
    } catch (error: any) {
        console.error('Failed to update ingestion log:', error.message)
    }
}
