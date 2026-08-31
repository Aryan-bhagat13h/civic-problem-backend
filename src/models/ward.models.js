import mongoose, { Schema } from 'mongoose'

const wardSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    location: {
      type: {
        type: String,
        enum: ["Polygon"],
        required: true,
        default: "Polygon"
      },
      coordinates: {
        type: [[[Number]]], // [ [ [lng, lat], [lng, lat], ... ] ]
        required: true
      }
    }
  },
  { timestamps: true }
)

wardSchema.index({ location: "2dsphere" })

export const Ward = mongoose.model("Ward", wardSchema)