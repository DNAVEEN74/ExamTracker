import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env'
import { router } from './routes'
import { apiRateLimiter } from './middleware/rateLimit'

const app = express()

// ─── Trust Proxy ─────────────────────────────────────────────────────────────
// Required when running behind Railway / Cloudflare / nginx.
// Without this, req.ip is the proxy's IP — all users share the same rate-limit bucket.
app.set('trust proxy', 1)

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet())

// Guard: FRONTEND_URL must be set in production so CORS doesn't silently allow everything
if (env.NODE_ENV === 'production' && !env.FRONTEND_URL) {
    throw new Error('FRONTEND_URL env var is required in production')
}
const allowedOrigins = [env.FRONTEND_URL, 'http://localhost:3000'].filter(Boolean) as string[]
app.use(cors({
    origin: allowedOrigins,
    credentials: true,
}))

// ─── Logging ──────────────────────────────────────────────────────────────────
if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'))
}

// ─── Body Parsing ─────────────────────────────────────────────────────────────
// Raw body for Razorpay webhook HMAC verification (must come BEFORE json())
// Explicit 2 mb limit prevents OOM from maliciously large payloads.
app.use('/api/v1/webhooks/razorpay', express.raw({ type: 'application/json', limit: '2mb' }))

app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))

// ─── Rate Limiting ─────────────────────────────────────────────────────────────
// 100 requests/minute per authenticated user. Auth routes have their own stricter limiter (10/min).
app.use('/api/v1', apiRateLimiter)

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() })
})

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/v1', router)

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'Route not found' })
})

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled error:', err)
    res.status(500).json({ success: false, error: env.NODE_ENV === 'production' ? 'Internal server error' : err.message })
})

export default app
