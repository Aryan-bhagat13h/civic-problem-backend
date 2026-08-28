import { uploadOnCloudinary } from "../utils/cloudinary";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/async-handler";

const registerIssue = asyncHandler(async(req,res) => {
    const refreshToken = req.cookies?.process.env.ACCESS_TOKEN_SECRET

    if(!refreshToken){
      throw new ApiError(401, "Unauthorised access")
    }

    const {title, description, category, location, coordinates, address } = req.body

    if([title, description, category, coordinates].some((field) => !field || field.trim() === "")){
      throw new ApiError(300, "All fields are required")
    }

    const photoOfIssueLocalPath = req.files?.photoOfIssue?.[0]?.path;

    if(!photoOfIssueLocalPath){
      throw new ApiError(400, "Photo is required")
    }

    const photoOfIssue = await uploadOnCloudinary(photoOfIssueLocalPath);

    const issue = await Issue.create({
      title,
      description,
      category,
      location,
      coordinates,
      address,
      photoOfIssue: photoOfIssue.url
    })

    const createdIssue = await Issue.findById(issue._id).select(
    "-refreshToken")

    if(!createdIssue){
      throw new ApiError(400, "Error occurred during creating an issue")
    }

    const options = {
      httpOnly: true,
      secure: true
    }

    return res
      .status(200)
      .cookie(refreshToken, options)
      .json("Issue registerd successfully")
})

export {registerIssue}