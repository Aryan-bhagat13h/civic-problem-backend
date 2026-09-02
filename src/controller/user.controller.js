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

const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Both old and new passwords are required");
  }

  const user = await User.findById(req.user?._id).select("+password");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordValid = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordValid) {
    throw new ApiError(400, "Old password is incorrect");
  }

  user.password = newPassword;
  await user.save();

  return res.status(200).json(
    new ApiResponse(200, {}, "Password changed successfully")
  );
});

const updateProfile = asyncHandler(async (req,res) => {
  const {fullname, email, username} = req.body

  if(!fullname && !email && !username){
    throw new ApiError(400, "At least one field is required to update profile")
  }

  let updatedFields = {}

  if(fullname !== undefined){
    updatedFields.fullname = fullname
  }
  if(email !== undefined){
    updatedFields.email = email
  }
  
  if(username !== undefined){
    updatedFields.usernmae = username.toLowerCase()
  }

  const userId = req.user?._id
  const user = await User.findByIdAndUpdate(
    userId,
      {
        $set: updatedFields
      },
      {
        new: true
      }
    ).select("-password -refreshToken")

  if(!user){
    throw new ApiError(404, "User not found")
  }

  return res
  .status(200)
  .json(new ApiResponse(200, user, "profile updated successfully"))
});

export { registerUser, loginUser,logoutUser, changePassword, updateProfile }