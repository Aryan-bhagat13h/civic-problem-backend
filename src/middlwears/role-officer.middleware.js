import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/async-handler";

const restrictedTo = asyncHandler(async(req,_,next) => {
  if(!req.user){
    throw new ApiError(401,"Authonentication required")
  }

  if(req.user.role !== "ward-officer"){
    throw new ApiError(403, "Access denied")
  }
  next()
})

export {restrictedTo}