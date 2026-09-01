import {asyncHandler} from '../utils/async-handler.js'
import {ApiError} from '../utils/apiError.js'
import { ApiResponse } from '../utils/apiResponse.js'
import { User } from '../models/user.models.js'
import { Ward } from '../models/ward.models.js' 
import mongoose from 'mongoose'

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId)
    if (!user) {
      throw new ApiError(404, "User not found")
    }
    const accessToken = user.generateAccessToken()

    const refreshToken = user.generateRefreshToken()
    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })

    return { accessToken, refreshToken }
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating tokens")
  }
}

const registerUser = asyncHandler(async (req, res) => {
  const { fullname, email, password, username, role, ward } = req.body

  if ([fullname, email, password, username].some((field) => !field || field.trim() === "")) {
    throw new ApiError(400, "All fields are required")
  }

  const userRole = role || "citizen"

  let wardId = undefined

  if (!["citizen", "ward-officer"].includes(userRole)) {
    throw new ApiError(400, "Invalid role")
  }

  if (!mongoose.Types.ObjectId.isValid(ward)) {
      throw new ApiError(400, "Invalid ward id")
    }

  const wardExists = await Ward.findById(ward)
    if (!wardExists) {
      throw new ApiError(404, "Ward not found")
    }

  wardId = wardExists._id

  const existedUser = await User.findOne({
    $or: [{ email }, { username }]
  })

  if (existedUser) {
    throw new ApiError(409, "User with same email or username already exists")
  }

  const user = await User.create({
    fullname,
    email,
    password,
    username: username.toLowerCase(),
    role: userRole,
    ward: wardId
  })

  const createdUser = await User.findById(user._id).select("-password -refreshToken")

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering user")
  }

  return res.status(201).json(
    new ApiResponse(201, createdUser, "User registered successfully")
  )
})

const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body

  if (!email && !username) {
    throw new ApiError(400, "Email or username is required")
  }

  const user = await User.findOne({
    $or: [{ email }, { username }]
  }).select("+password")

  if (!user) {
    throw new ApiError(400, "User doesn't exist, please register first")
  }

  const isPasswordValid = await user.isPasswordCorrect(password)

  if (!isPasswordValid) {
    throw new ApiError(400, "Password is incorrect")
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

  const options = {
    httpOnly: true,
    secure: true
  }

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in successfully"
      )
    )
})

const logoutUser = asyncHandler(async(req,res) => {
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $set:{
          refreshToken: null
        }
      },
      {
        new: true
      }
    )

    const options = {
      httpOnly: true,
      secure: true
    }

    return res
      .status(200)
      .clearCookie("refreshToken",options)
      .clearCookie("accessToken",options)
      .json(new ApiResponse(200, "User logout successfully"))
})

export { registerUser, loginUser,logoutUser }