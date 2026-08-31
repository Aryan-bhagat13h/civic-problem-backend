import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

const app = express()

app.use(cors({
  origin: process.env.ORIGIN_CORS,
  Credentials: true
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

import userRouter from './routes/user.routes.js'
import issueRouter from './routes/issue.routes.js'

app.use("/api/v1/users", userRouter)
app.use("/api/v1/issues", issueRouter)

export { app }
