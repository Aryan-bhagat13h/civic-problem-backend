import { Issue } from "../models/issue.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse} from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/async-handler.js"
import {User} from "../models/user.models.js"
import {Ward} from "../models/ward.models.js"
import mongoose from "mongoose"
import { sendIssueResolved } from "../utils/mail.js"

const registerIssue = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized access")
  }

  const { title, description, category, address } = req.body

  if ([title, description, category].some((field) => !field || field.trim() === "")) {
    throw new ApiError(400, "All fields are required")
  }

  let { coordinates } = req.body
    if (typeof coordinates === "string") {
    try { coordinates = JSON.parse(coordinates) } catch { coordinates = null }
}

  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    throw new ApiError(400, "Valid coordinates [longitude, latitude] are required")
  }

  const ward = await Ward.findOne({
    location: {
      $geoIntersects: {
        $geometry: { type: "Point", coordinates: coordinates }
      }
    }
  })

if (!ward) {
  throw new ApiError(400, "Location falls outside any known ward")
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

  const officer = await User.findOne({ role: "ward-officer", ward: ward._id })

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
    ward : ward._id,
    reportedBy: req.user._id,
    assignedTo: officer?._id
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

const getMyIssues = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 10
  const skip = (page - 1) * limit

  const issues = await Issue.find({ isDeleted: false, reportedBy: req.user._id })
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
    .populate("ward", "name")
    .populate("assignedTo", "fullname email")

  return res
    .status(200)
    .json(new ApiResponse(200, issues, "Your issues fetched successfully"))
})

const updateStatus = asyncHandler(async(req,res) => {

  const { issueId } = req.params
  const issue = await Issue.findById(issueId)

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

  const wasResolved = issue.status = "resolved"
  issue.status = status;

  if(status === "resolved"){
    issue.resolvedAt = new Date();
  }
  await issue.save();


  if(status === "resolved"){
    sendIssueResolved(issue.reportedBy.email, issue).catch((err) => {
      console.log("Error occured while sending email", err)
    })
  }
  
  return res
  .status(200)
  .json(new ApiResponse(200, issue, "Issue status successful"))

})

const deleteIssue = asyncHandler(async(req,res) => {
  const {issueId} = req.params
  const issue = await Issue.findById(issueId)
  if(!issue){
    throw new ApiError(404, "Issue not found")
  }

  issue.isDeleted = true
  issue.deletedAt = new Date();
  issue.deletedBy = req.user._id,
  issue.deleteReason = req.params.reason || 'Not specified'

  await issue.save()

  return res
    .status(200)
    .json(new ApiResponse(200, issue, "Issue deleted successfully"))
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
    .sort({createdAt: -1})
    .populate("ward", "name")
    .populate("reportedBy", "fullname email")
    .populate("assignedTo", "fullname email")


  return res
    .status(200)
    .json(new ApiResponse(200, issue, "ward issues fetched successfully"))
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

const resolvedIssue = asyncHandler(async(req,res) => {
  const {resolvedAt} = req.body
  const resolutionPhotoLocalPath = req.files?.resolutionPhoto?.[0].path

  if(!resolutionPhotoLocalPath){
    throw new ApiError(400, "Photo is required")
  }

  const resolutionPhoto = uploadOnCloudinary(resolutionPhotoLocalPath)
  if(!resolutionPhoto){
    throw new ApiError(400, "Error occured while uploading the photo")
  }

  const issue = await Issue.findByIdAndUpdate(
    req.params?._id,
    {
      $set: {
        resolvedAt,
        resolutionPhoto: resolutionPhoto.url,
        isResolved: true
      }
    },
    {
      new:true
    }
  )

  if(!issue){
    throw new ApiError(404, "Issue not found")
  }

  return res
    .status(200)
    .json(new ApiResponse(200, issue, "Issue updated successfully"))
})

const rejectIssue = asyncHandler(async (req, res) => {
  const { issueId } = req.params
  const { rejectionReason } = req.body

  if (!rejectionReason || rejectionReason.trim() === "") {
    throw new ApiError(400, "Rejection reason is required")
  }

  const issue = await Issue.findByIdAndUpdate(
    issueId,
    {
      $set: {
        status: "rejected",
        rejectedAt: new Date(),
        rejectedBy: req.user._id,
        rejectionReason: rejectionReason.trim(),
        isRejected: true
      }
    },
    { new: true }
  )

  if (!issue) {
    throw new ApiError(404, "Issue not found")
  }

  return res
    .status(200)
    .json(new ApiResponse(200, issue, "Issue rejected successfully"))
})

const commentOnIssue = asyncHandler(async(req,res) => {
  const {issueId} = req.params
  const {comment} = req.body

  if(!comment || comment.trim() === ""){
    throw new ApiError(400, "Comment is required")
  }

  const issue = await Issue.findById(issueId)

  if(!issue){
    throw new ApiError(404, "Issue not found")
  }

  const newComment = await Comment.create({
      comment: comment.trim(),
      issue: issue?._id,
      user: req.user?._id 
  })

  if(!newComment){
    throw new ApiError(400, "Error occured while creating comment")
  }

  return res
    .status(200)
    .json(200, comment, "Comment created successfully")
})

const reopenIssue = asyncHandler(async (req, res) => {
  const { issueId } = req.params
  const issue = await Issue.findById(issueId)

  if (!issue) {
    throw new ApiError(404, "Issue not found")
  }

  if (!issue.reportedBy.equals(req.user._id)) {
    throw new ApiError(403, "You can only reopen your own issues")
  }

  if (issue.status !== "resolved") {
    throw new ApiError(400, "Only resolved issues can be reopened")
  }

  issue.status = "pending"
  issue.reopenedAt = new Date()

  await issue.save()

  return res
    .status(200)
    .json(new ApiResponse(200, issue, "Issue reopened successfully"))
})

export { registerIssue, trackIssue, updateStatus, deleteIssue, getAllIssues, getWardIssues, assignOfficer, getMyIssues,resolvedIssue, commentOnIssue, rejectIssue, reopenIssue }