import { User } from "../models/user.models.js";
import { Issue } from "../models/issue.models.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import mongoose from "mongoose";

const citizenImpact = asyncHandler(async (req, res) => {
    const targetUserId = req.params.userId || req.user?._id;

    if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
        throw new ApiError(400, "Invalid user id");
    }

    const user = await User.findById(targetUserId);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const issueStatusCount = await Issue.aggregate([
        {
            $match: { 
                reportedBy: new mongoose.Types.ObjectId(targetUserId),
                isDeleted: false
            } 
        },
        {
            $group: { _id: "$status", count: { $sum: 1 } }
        },
        {
            $sort: { count: -1 }
        }
    ]);

    const totalIssues = await Issue.countDocuments({
        reportedBy: new mongoose.Types.ObjectId(targetUserId),
        isDeleted: false
    });

    return res
        .status(200)
        .json(new ApiResponse(200, { issueStatusCount, totalIssues }, "Citizen impact stats fetched successfully"));
});

export { citizenImpact };