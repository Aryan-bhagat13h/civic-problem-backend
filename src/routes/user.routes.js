import { Router } from "express"
import { registerUser, loginUser, logoutUser } from "../controller/user.controller.js"
import { verifyJwt } from "../middlwears/auth.middlerware.js"

const router = Router()

router.route("/register").post(registerUser)
router.route("/login").post(loginUser)
router.route("/logout").post(verifyJwt, logoutUser)

export default router