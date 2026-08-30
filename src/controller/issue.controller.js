import { Issue } from "../models/issue.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/async-handler.js"
import {User} from "../models/user.models.js"
import mongoose from "mongoose"

const registerIssue = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized access")
  }

  const { title, description, category, coordinates, address, ward } = req.body

  if ([title, description, category].some((field) => !field || field.trim() === "")) {
    throw new ApiError(400, "All fields are required")
  }

  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    throw new ApiError(400, "Valid coordinates [longitude, latitude] are required")
  }

  if (!ward) {
    throw new ApiError(400, "Ward is required")
  }

  const photoOfIssueLocalPath = req.files?.photoOfIssue?.[0]?.path

  if (!photoOfIssueLocalPath) {
    throw new ApiError(400, "Photo is required")
  }

  const photoOfIssue = await uploadOnCloudinary(photoOfIssueLocalPath)

  if (!photoOfIssue?.url) {
    throw new ApiError(500, "Error occurred while uploading photo")
  }

  const issue = await Issue.create({
    title,
    description,
    category,
    location: {
      type: "Point",
      coordinates,
      address
    },
    photoOfIssue: photoOfIssue.url,
    ward,
    reportedBy: req.user._id
  })

  const createdIssue = await Issue.findById(issue._id)

  if (!createdIssue) {
    throw new ApiError(500, "Error occurred while creating issue")
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdIssue, "Issue registered successfully"))
})

const trackIssue = asyncHandler(async (req, res) => {
  const { issueId } = req.params

  if (!mongoose.Types.ObjectId.isValid(issueId)) {
    throw new ApiError(400, "Invalid issue id")
  }

  const issue = await Issue.findById(issueId)
    .populate("assignedTo", "fullname email")
    .populate("ward", "name")

  if (!issue) {
    throw new ApiError(404, "No registered issue found")
  }

  return res
    .status(200)
    .json(new ApiResponse(200, issue, "Issue status fetched successfully"))
})

const updateStatus = asyncHandler(async(req,res) => {

  const issue = await Issue.findById(req.params._id)

  if(!issue){
    throw new ApiError(404, "Issue not found")
  }

  const {status} = req.body
  if(!status){
    throw new ApiError(400, "Status is required")
  }

  const allowedStatus = Issue.schema.path('status').enumValues

  if(!allowedStatus.includes(status)){
    throw new ApiError(400, "Invalid status")
  }

  issue.status = status;
  await issue.save();

  return res.status(200)

})

const deleteIssue = asyncHandler(async(req,res) => {
  const issue = await Issue.findById(req.params._id)
  if(!issue){
    throw new ApiError(404, "Issue not foung")
  }

  issue.isDeleted = true
  issue.deletedAt = new Date();
  issue.deletedBy = req.user._id,
  issue.deleteReason = req.body.reason || 'Not specified'

  await issue.save()
})

//ward-officers only
const getAllIssues = asyncHandler(async(req,res) => {

  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 10
  const skip = (page - 1) * limit

  const issue = await Issue.find({isDeleted : false})
    .skip(skip)
    .limit(limit)
    .sort({createdAt: -1})
    .populate("status", "status")
    .populate("ward", "name")
    .populate("reportedBy", "fullname email")
    .populate("assignedTo", "fullname email")

  if(!issue){
    throw new ApiError(404, "no issues found")
  }

  return res
    .status(200)
    .json(new ApiResponse(200, issue, "All issues fetched successfully"))
})

const getWardIssues = asyncHandler(async(req,res) => {
  const issue = await Issue.find({isDeleted: false, ward: req.user.ward})
    .limit(10)
    .sort({CreatedAt: -1})
    .populate("ward", "name")
    .populate("reportedBy", "fullname email")
    .populate("assignedTo", "fullname email")
    .populate("status", "status")

  if(!issue){
  throw new ApiError(404, "no issues found")

  return res
    .status(200)
    .json(new ApiResponse(200, issue, "ward issues fetched successfully"))
  }
})

const assignOfficer = asyncHandler(async(req,res) => {
  const {issueId} = req.params

  const issue = await Issue.findById(issueId)

  if(!issue){
    throw new ApiError(404, "issue not found")
  }

  const {officerId} = req.body

  const officer = await User.findOne({_id: officerId, role: "ward-officer"})

  if (!officer) {
    throw new ApiError(404, "Ward officer not found")
  }

  issue.assignedTo = officer
  await issue.save()

  return res
    .status(200)
    .json(new ApiResponse(200, officer, "Officer assigned successfully"))
})

export { registerIssue, trackIssue, updateStatus, deleteIssue, getAllIssues, getWardIssues, assignOfficer }