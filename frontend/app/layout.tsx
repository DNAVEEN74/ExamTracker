import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'ExamTracker India — Never Miss a Government Exam Deadline',
    template: '%s | ExamTracker India',
  },
  description:
    'Personal eligibility intelligence for Indian government job aspirants. Know exactly which exams you can apply for, your category vacancies, and every upcoming deadline — personalized to your profile.',
  keywords: [
    'government exam', 'sarkari naukri', 'SSC CGL', 'UPSC', 'IBPS', 'Railway exam',
    'exam tracker', 'eligibility checker', 'government job alert', 'sarkari result',
  ],
  authors: [{ name: 'ExamTracker India' }],
  openGraph: {
    title: 'ExamTracker India — Never Miss a Government Exam Deadline',
    description: 'Find every government exam you qualify for. Track deadlines. Get alerts.',
    type: 'website',
    locale: 'en_IN',
    siteName: 'ExamTracker India',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ExamTracker India',
    description: 'Never miss a government exam deadline again.',
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FF6B35',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
