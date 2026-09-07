import { asyncHandler } from "../utils/async-handler.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { Issue } from "../models/issue.models.js"

const getIssueStats = asyncHandler(async (req, res) => {
  const statusCounts = await Issue.aggregate([
    { $match: { isDeleted: false } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ])
 
  const categoryCounts = await Issue.aggregate([
    { $match: { isDeleted: false } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ])
 
  const countByWard = await Issue.aggregate([
    { $match: { isDeleted: false } },
    { $group: { _id: "$ward", count: { $sum: 1 } } },
    {
      $lookup: {
        from: "wards",
        localField: "_id",
        foreignField: "_id",
        as: "wardDetails"
      }
    },
    { $unwind: "$wardDetails" },
    {
      $project: {
        _id: 0,
        wardName: "$wardDetails.name",
        count: 1
      }
    },
    { $sort: { count: -1 } }
  ])
 
  const avgResolutionResult = await Issue.aggregate([
    {
      $match: {
        isDeleted: false,
        status: "resolved",
        resolvedAt: { $exists: true }
      }
    },
    {
      $project: {
        resolutionHours: {
          $divide: [
            { $subtract: ["$resolvedAt", "$createdAt"] },
            1000 * 60 * 60 
          ]
        }
      }
    },
    {
      $group: {
        _id: null,
        avgHours: { $avg: "$resolutionHours" },
        resolvedCount: { $sum: 1 }
      }
    }
  ])
 
  const avgResolutionTime = {
    hours: avgResolutionResult[0]?.avgHours
      ? Number(avgResolutionResult[0].avgHours.toFixed(2))
      : 0,
    resolvedCount: avgResolutionResult[0]?.resolvedCount || 0
  }
 
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        statusCounts,
        categoryCounts,
        countByWard,
        avgResolutionTime
      },
      "Stats fetched successfully"
    )
  )
})

export {getIssueStats}