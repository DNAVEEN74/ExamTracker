import { Router } from 'express'
import authRouter from './auth'
import onboardingRouter from './onboarding'
import profileRouter from './profile'
import examsRouter from './exams'
import dashboardRouter from './dashboard'
import notificationsRouter from './notifications'
import adminRouter from './admin'
import webhooksRouter from './webhooks'

export const router = Router()

router.use('/auth', authRouter)
router.use('/onboarding', onboardingRouter)
router.use('/profile', profileRouter)
router.use('/exams', examsRouter)
router.use('/dashboard', dashboardRouter)
router.use('/notifications', notificationsRouter)
router.use('/admin', adminRouter)
router.use('/webhooks', webhooksRouter)
