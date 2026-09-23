import { Router } from "express"
import { 
  registerUser, 
  loginUser, 
  logoutUser, 
  changePassword, 
  updateProfile,
  forgotPassword,
  verifyOtp,
  resetPasswordWithToken
} from "../controller/user.controller.js"
import { verifyJwt } from "../middlwears/auth.middlerware.js"
import { citizenImpact } from "../controller/citizen-impact.controller.js"

const router = Router()

router.route("/register").post(registerUser)
router.route("/login").post(loginUser)
router.route("/logout").post(verifyJwt, logoutUser)
router.route("/change-password").post(verifyJwt, changePassword)
router.route("/update-profile").patch(verifyJwt, updateProfile)
router.route("/forgot-password").post(forgotPassword)
router.route("/verify-otp").post(verifyOtp)
router.route("/reset-password").post(resetPasswordWithToken)
router.route("/impact").get(verifyJwt, citizenImpact)
router.route("/:userId/impact").get(verifyJwt, citizenImpact)

export default router