import { Router } from "express"
import { verifyJwt } from "../middlewares/auth.middleware.js"
import { restrictedToCitizen, restrictedToOfficer } from "../middlewares/role.middleware.js"
import { upload } from "../middlewares/multer.middleware.js"
import {
  registerIssue,
  trackIssue,
  getMyIssues,
  updateStatus,
  deleteIssue,
  getAllIssues,
  getWardIssues,
  assignOfficer
} from "../controller/issue.controller.js"

const router = Router()

router.use(verifyJwt)

router.route("/register").post(
  restrictedToCitizen,
  upload.fields([{ name: "photoOfIssue", maxCount: 1 }]),
  registerIssue
)
router.route("/:issueId").get(restrictedToCitizen, trackIssue)
router.route("/mine").get(restrictedToCitizen, getMyIssues)
router.route("/:issueId").delete(restrictedToCitizen, deleteIssue)

router.route("/").get(restrictedToOfficer, getAllIssues)
router.route("/ward/mine").get(restrictedToOfficer, getWardIssues)
router.route("/:issueId/status").patch(restrictedToOfficer, updateStatus)
router.route("/:issueId/assign").patch(restrictedToOfficer, assignOfficer)

export default router