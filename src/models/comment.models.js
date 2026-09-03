import mongoose, {Schema} from 'mongoose'
const commentSchema = new Schema({
  issue: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Issue"
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    maxLength: 500
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
},{timestamps: true})

const Comment = mongoose.model("Comment", commentSchema)