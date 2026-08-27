import express from 'express'
import mongoose from 'mongoose'
import 'dotenv/config'

const app = express()
const PORT = process.env.PORT || 8000

app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
.then(() => {
  console.log('connected to DB')
})
.catch((err) => {console.log(err)})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});