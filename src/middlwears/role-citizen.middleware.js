import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/async-handler";

const restrictedToOfficer = asyncHandler(async(req,_,next) => {
  if(!req.user){
    throw new ApiError(401,"Authonentication required")
  }

  if(req.user.role !== "citizen"){
    throw new ApiError(403, "Access denied")
  }
  next()
})

export {restrictedToOfficer}