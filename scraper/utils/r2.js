/**
 * Cloudflare R2 Storage — PDF Upload Utility
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Uses lazy initialization — S3Client is created on first upload,
 * not at module load time. This means missing env vars won't crash
 * the entire scraper on import.
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

let _r2Client = null

function getR2Client() {
    if (_r2Client) return _r2Client

    const accountId = process.env.R2_ACCOUNT_ID
    const accessKeyId = process.env.R2_ACCESS_KEY_ID
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

    if (!accountId || accountId === 'stub') throw new Error('R2_ACCOUNT_ID not configured — set it in .env')
    if (!accessKeyId || accessKeyId === 'stub') throw new Error('R2_ACCESS_KEY_ID not configured — set it in .env')
    if (!secretAccessKey || secretAccessKey === 'stub') throw new Error('R2_SECRET_ACCESS_KEY not configured — set it in .env')

    _r2Client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
    })

    return _r2Client
}

export async function uploadToR2(storagePath, buffer, contentType = 'application/pdf') {
    const client = getR2Client() // Throws with a clear message if not configured
    const bucket = process.env.R2_BUCKET_NAME
    if (!bucket || bucket === 'stub') throw new Error('R2_BUCKET_NAME not configured — set it in .env')

    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: storagePath,
        Body: buffer,
        ContentType: contentType,
    })

    await client.send(command)
    return storagePath
}
