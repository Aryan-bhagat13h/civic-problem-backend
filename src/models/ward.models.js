import mongoose, {Schema} from 'mongoose'

const wardSchema = new Schema({
    name: {
      type: String,
      required: true,
      unique: true
    },
    location: {
      type: { 
      type: String,
      enum: ["Polygon"],
      required: true,
      default: "Polygon"
      },
      coordiantes : {
        type:[[[Number]]],
        required: true
      }
    }
},{timestamps: true})

wardSchema.index({location : "2dsphere"})
wardSchema.index({ boundary: "2dsphere" })

export const Ward = mongoose.model("Ward", wardSchema)