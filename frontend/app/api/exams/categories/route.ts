import { NextResponse } from 'next/server'

/** GET /api/exams/categories — Available exam categories */
export async function GET() {
    const categories = ['SSC', 'RAILWAY', 'BANKING', 'UPSC_CIVIL', 'STATE_PSC', 'DEFENCE', 'POLICE', 'TEACHING', 'PSU', 'OTHER']
    return NextResponse.json({ success: true, data: categories })
}
