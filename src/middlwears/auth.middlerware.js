import { User } from "../models/user.models.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/async-handler.js";

const verifyJwt =  asyncHandler(async(req,_,next) => {
  try{
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")

    if(!token){
      throw new ApiError(400, "Unauthorised access")
    }

    const decodedToken = Jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    const user = await User.findById(decodedToken?._id).select("-password -accessToken")

    if(!user){
      throw new ApiError(300, "User is unauthorised")
    }

    req.user = user
    next()
  }
  catch(err){
    throw new ApiError(err, "something went wrong")
  }
})

export {verifyJwt}