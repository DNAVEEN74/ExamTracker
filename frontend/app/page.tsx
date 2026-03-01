import type { Metadata } from 'next'
import { LandingPageClient } from '@/components/landing/LandingPageClient'

export const metadata: Metadata = {
  title: 'ExamTracker India — Never Miss a Government Exam Deadline',
  description: 'Personal eligibility intelligence for Indian government job aspirants. Know which exams you qualify for, your category vacancies, and every deadline — all in one place.',
}

export default function LandingPage() {
  return <LandingPageClient />
}
