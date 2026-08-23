// app.ts
import express, { NextFunction, Request, Response } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import authRouter from './routes/auth.routes'
import workspaceRouter from './routes/workspace.routes'
import inviteRouter from './routes/invite.routes'
import issueRouter from './routes/issue.routes'
import sprintRouter from './routes/sprint.routes'
import { healthRouter } from './routes/health'
import { env } from './config/env'

const app = express()

app.use(express.json({ limit: '10kb' }))
app.use(cookieParser())

if(env.frontendUrl){
    app.use(cors({ origin: env.frontendUrl, credentials: true }))
}

app.use(healthRouter)
app.use('/auth', authRouter)
app.use('/workspaces',workspaceRouter)
app.use('/invites',inviteRouter)
app.use('/workspaces/:id/issues', issueRouter)
app.use('/workspaces/:id/sprints', sprintRouter)

// Centralized error handler: never leak internals (stack traces, DB errors)
// to the client. Express 5 forwards rejected async handlers here automatically.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err)
    res.status(500).json({ message: 'Something went wrong' })
})

export default app