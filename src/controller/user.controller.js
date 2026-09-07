import { asyncHandler } from '../utils/async-handler.js'
import { ApiError } from '../utils/apiError.js'
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

  if ([fullname, email, password, username].some((field) => !field || String(field).trim() === "")) {
    throw new ApiError(400, "All fields (fullname, email, password, username) are required")
  }

  const userRole = role || "citizen"
  if (!["citizen", "ward-officer", "admin"].includes(userRole)) {
    throw new ApiError(400, "Invalid role")
  }

  let wardId = undefined

  if (userRole === "ward-officer" && !ward) {
    throw new ApiError(400, "Ward is required for ward officers")
  }

  if (ward) {
    if (!mongoose.Types.ObjectId.isValid(ward)) {
      throw new ApiError(400, "Invalid ward id")
    }
    const wardExists = await Ward.findById(ward)
    if (!wardExists) {
      throw new ApiError(404, "Ward not found")
    }
    wardId = wardExists._id
  }

  const existedUser = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }]
  })

  if (existedUser) {
    throw new ApiError(409, "User with same email or username already exists")
  }

  const user = await User.create({
    fullname,
    email: email.toLowerCase(),
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

  if (!password) {
    throw new ApiError(400, "Password is required")
  }

  const queryConditions = []
  if (email) queryConditions.push({ email: email.toLowerCase() })
  if (username) queryConditions.push({ username: username.toLowerCase() })

  const user = await User.findOne({
    $or: queryConditions
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

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
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
    .clearCookie("refreshToken", options)
    .clearCookie("accessToken", options)
    .json(new ApiResponse(200, null, "User logout successfully"))
})

const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Both old and new passwords are required")
  }

  const user = await User.findById(req.user?._id).select("+password")

  if (!user) {
    throw new ApiError(404, "User not found")
  }

  const isPasswordValid = await user.isPasswordCorrect(oldPassword)

  if (!isPasswordValid) {
    throw new ApiError(400, "Old password is incorrect")
  }

  user.password = newPassword
  await user.save()

  return res.status(200).json(
    new ApiResponse(200, {}, "Password changed successfully")
  )
})

const updateProfile = asyncHandler(async (req, res) => {
  const { fullname, email, username } = req.body

  if (!fullname && !email && !username) {
    throw new ApiError(400, "At least one field is required to update profile")
  }

  const userId = req.user?._id

  let updatedFields = {}

  if (fullname !== undefined) {
    if (fullname.trim() === "") throw new ApiError(400, "Fullname cannot be empty")
    updatedFields.fullname = fullname
  }
  if (email !== undefined) {
    if (email.trim() === "") throw new ApiError(400, "Email cannot be empty")
    const existingEmail = await User.findOne({ email: email.toLowerCase(), _id: { $ne: userId } })
    if (existingEmail) throw new ApiError(409, "Email is already taken")
    updatedFields.email = email.toLowerCase()
  }
  if (username !== undefined) {
    if (username.trim() === "") throw new ApiError(400, "Username cannot be empty")
    const existingUsername = await User.findOne({ username: username.toLowerCase(), _id: { $ne: userId } })
    if (existingUsername) throw new ApiError(409, "Username is already taken")
    updatedFields.username = username.toLowerCase()
  }

  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: updatedFields
    },
    {
      new: true,
      runValidators: true
    }
  ).select("-password -refreshToken")

  if (!user) {
    throw new ApiError(404, "User not found")
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "profile updated successfully"))
})

export { registerUser, loginUser, logoutUser, changePassword, updateProfile }