import app from './app'
import { env } from './config/env'

const PORT = parseInt(env.PORT, 10)

app.listen(PORT, () => {
    console.log(`\n🚀 ExamTracker API running on http://localhost:${PORT}`)
    console.log(`   Environment: ${env.NODE_ENV}`)
    console.log(`   Health: http://localhost:${PORT}/health\n`)
})
