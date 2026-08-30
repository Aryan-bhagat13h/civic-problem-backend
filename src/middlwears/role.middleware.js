import { ApiError } from "../utils/apiError.js"

export const restrictedToCitizen = (req, _res, next) => {
  if (!req.user) {
    throw new ApiError(401, "Unauthorized request")
  }
  if (req.user.role !== "citizen") {
    throw new ApiError(403, "Access restricted to citizens only")
  }
  next()
}

export const restrictedToOfficer = (req, _res, next) => {
  if (!req.user) {
    throw new ApiError(401, "Unauthorized request")
  }
  if (req.user.role !== "ward-officer") {
    throw new ApiError(403, "Access restricted to ward officers only")
  }
  next()
}