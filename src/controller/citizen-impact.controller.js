import { User } from "../models/user.models.js";
import { Issue } from "../models/issue.models.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js"; // adjust path if named differently
import mongoose from "mongoose";

const citizenImpact = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user id");
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const issueStatusCount = await Issue.aggregate([
        {
            $match: { createdBy: new mongoose.Types.ObjectId(userId) } 
        },
        {
            $group: { _id: "$status", count: { $sum: 1 } }
        },
        {
            $sort: { count: -1 }
        }
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, issueStatusCount, "Citizen impact stats fetched successfully"));
});

export { citizenImpact };