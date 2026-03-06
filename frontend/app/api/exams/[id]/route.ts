import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { applyRateLimit } from '@/lib/rateLimit'
import * as examService from '@/lib/services/exam.service'
import * as eligibilityService from '@/lib/services/eligibility.service'
import db from '@/lib/db'


export const dynamic = 'force-dynamic'

/** GET /api/exams/[id] — Single exam with eligibility flag */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { user, errorResponse } = await requireAuth(request)
    if (errorResponse) return errorResponse

    const rl = await applyRateLimit(request, user)
    if (rl) return rl

    try {
        const { id } = await params
        const exam = await examService.getExamById(id)
        if (!exam) {
            return NextResponse.json({ success: false, error: 'Exam not found' }, { status: 404 })
        }

        const profile = await db.userProfile.findUnique({
            where: { user_id: user.id }
        })

        const eligibilityFlag = eligibilityService.computeEligibilityFlag(
            profile as Record<string, unknown> | null,
            exam as unknown as Record<string, unknown>
        )

        return NextResponse.json({ success: true, data: { ...exam, eligibility_flag: eligibilityFlag } })
    } catch (err) {
        console.error('GET /api/exams/[id] error:', err)
        return NextResponse.json({ success: false, error: 'Failed to get exam' }, { status: 500 })
    }
}
