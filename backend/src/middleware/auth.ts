import { Request, Response, NextFunction } from 'express'
import { verifyJWT } from '../config/supabase'

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string
                email?: string
                phone?: string
                app_metadata: Record<string, unknown>
            }
        }
    }
}

/** Verifies Supabase JWT. Attaches user to req.user. Returns 401 if invalid. */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Missing or invalid Authorization header' })
    }
    const token = authHeader.replace('Bearer ', '')
    const user = await verifyJWT(token)
    if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid or expired token' })
    }
    req.user = {
        id: user.id,
        email: user.email,
        phone: user.phone,
        app_metadata: user.app_metadata as Record<string, unknown>,
    }
    next()
}

/** Requires admin or editor role in Supabase app_metadata */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    const role = req.user?.app_metadata?.role as string | undefined
    if (role !== 'admin' && role !== 'editor') {
        return res.status(403).json({ success: false, error: 'Forbidden' })
    }
    next()
}
