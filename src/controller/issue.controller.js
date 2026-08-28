import { Issue } from "../models/issue.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/async-handler.js"

const registerIssue = asyncHandler(async (req, res) => {
  // req.user should be set by a verifyJWT auth middleware on this route
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

export { registerIssue }