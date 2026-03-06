import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

let r2ClientInstance: S3Client | null = null

export function getR2Client() {
    if (r2ClientInstance) return r2ClientInstance

    if (!process.env.R2_ACCOUNT_ID) throw new Error('R2_ACCOUNT_ID is required')
    if (!process.env.R2_ACCESS_KEY_ID) throw new Error('R2_ACCESS_KEY_ID is required')
    if (!process.env.R2_SECRET_ACCESS_KEY) throw new Error('R2_SECRET_ACCESS_KEY is required')
    if (!process.env.R2_BUCKET_NAME) throw new Error('R2_BUCKET_NAME is required')

    r2ClientInstance = new S3Client({
        region: 'auto',
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        }
    })
    return r2ClientInstance
}

/**
 * Upload a PDF buffer to Cloudflare R2
 * Returns the object storage key (path) on success.
 */
export async function uploadToR2(storagePath: string, buffer: Buffer, contentType = 'application/pdf') {
    const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: storagePath,
        Body: buffer,
        ContentType: contentType,
        // R2 doesn't technically strictly do conditional 'upsert: false' the same way Supabase did at the API level
        // so we overwrite if it exists. Hash checks prevent duplicate work beforehand anyway.
    })

    const client = getR2Client()
    await client.send(command)
    return storagePath
}
