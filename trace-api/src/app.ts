// app.ts
import express, { NextFunction, Request, Response } from 'express'
import cors from 'cors'
import authRouter from './routes/auth.routes'
import { healthRouter } from './routes/health'
import { env } from './config/env'

const app = express()

app.use(express.json({ limit: '10kb' }))

if(env.frontendUrl){
    app.use(cors({ origin: env.frontendUrl, credentials: true }))
}

app.use(healthRouter)
app.use('/auth', authRouter)

// Centralized error handler: never leak internals (stack traces, DB errors)
// to the client. Express 5 forwards rejected async handlers here automatically.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err)
    res.status(500).json({ message: 'Something went wrong' })
})

export default app