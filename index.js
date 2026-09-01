import 'dotenv/config'
import mongoose from 'mongoose'
import { app } from './src/app.js'

const PORT = process.env.PORT || 3000

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('connected to DB')
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })
  })
  .catch((err) => {
    console.log("MongoDB connection failed:", err)
    process.exit(1)
  })