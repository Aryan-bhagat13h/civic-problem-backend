import mongoose, { Schema } from "mongoose";

const issueSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: ["Pothole", "Streetlight", "Garbage", "Water-leak", "Drainage", "Tree-fall", "Other"],
      required: true
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true
      },
      address: {
        type: String,
        trim: true
      }
    },
    photoOfIssue: {
      type: String, // cloudinary url
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "in-progress", "resolved", "rejected"],
      default: "pending"
    },
    resolutionPhoto: {
      type: String // cloudinary url, set when marked resolved
    },
    resolvedAt: {
      type: Date
    },
    ward: {
      type: Schema.Types.ObjectId,
      ref: "Ward",
      required: true
    },
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User" // ward-officer
    }
  },
  { timestamps: true }
);

issueSchema.index({ location: "2dsphere" });

export const Issue = mongoose.model("Issue", issueSchema);