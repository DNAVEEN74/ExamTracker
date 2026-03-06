import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

if (!process.env.R2_ACCOUNT_ID) throw new Error('R2_ACCOUNT_ID is required')
if (!process.env.R2_ACCESS_KEY_ID) throw new Error('R2_ACCESS_KEY_ID is required')
if (!process.env.R2_SECRET_ACCESS_KEY) throw new Error('R2_SECRET_ACCESS_KEY is required')
if (!process.env.R2_BUCKET_NAME) throw new Error('R2_BUCKET_NAME is required')

export const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    }
})

export async function uploadToR2(storagePath, buffer, contentType = 'application/pdf') {
    const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: storagePath,
        Body: buffer,
        ContentType: contentType,
    })

    await r2Client.send(command)
    return storagePath
}
