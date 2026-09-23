import { Router } from "express"
import { verifyJwt } from "../middlwears/auth.middlerware.js"
import { restrictedToAdmin } from "../middlwears/role.middleware.js"
import { getIssueStats } from "../controller/adminStats.controller.js"

const router = Router()

router.use(verifyJwt, restrictedToAdmin)

router.route("/").get(getIssueStats)
router.route("/overview").get(getIssueStats)

export default router
