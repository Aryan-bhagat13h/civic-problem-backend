import mongoose, { Schema } from "mongoose";
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"]
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"]
    },
    fullname: {
      type: String,
      required: true,
      trim: true
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false
    },
    ward: {
      type: Schema.Types.ObjectId,
      ref: "Ward",
      required: function () {
        return this.role === "ward-officer";
      }
    },
    role: {
      type: String,
      enum: ["citizen", "ward-officer"],
      required: true,
      default: "citizen"
    },
    refreshToken: {
    type: String,
    required: true
  }
  },
  { timestamps: true }
);

userSchema.pre("save",  async function(next) {
  if(!this.isModified("password"))return;
   this.password = await bcrypt.hash(this.password, 10)
   next()
})

userSchema.methods.isPasswordCorrect = async function(password){
  return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function (){
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullname: this.fullname
   },
   process.env.ACCESS_TOKEN_SECRET,
   {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY
   }
)
}

userSchema.methods.generateRefreshToken = function (){
  return jwt.sign(
    {
      _id: this._id,
   },
   process.env.REFRESH_TOKEN_SECRET,
   {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY
   }
)
}
export const User = mongoose.model("User", userSchema);