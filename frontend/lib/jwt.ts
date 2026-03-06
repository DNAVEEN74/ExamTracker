import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

export interface AuthUser {
    id: string
    email?: string
    phone?: string
    role?: string
}

function getSecretKey() {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET environment variable is missing')
    }
    return new TextEncoder().encode(process.env.JWT_SECRET)
}

/** Generate a stateless JWT for the authenticated user (expires in 30 days) */
export async function signJWT(user: AuthUser, expiresIn = '30d'): Promise<string> {
    const payload: JWTPayload = {
        sub: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role ?? 'user',
    }

    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(expiresIn)
        .sign(getSecretKey())
}

/** Verify and parse a JWT string back into AuthUser */
export async function verifyJWT(token: string): Promise<AuthUser | null> {
    try {
        const { payload } = await jwtVerify(token, getSecretKey())
        return {
            id: payload.sub as string,
            email: payload.email as string | undefined,
            phone: payload.phone as string | undefined,
            role: payload.role as string | undefined,
        }
    } catch (error) {
        return null
    }
}
