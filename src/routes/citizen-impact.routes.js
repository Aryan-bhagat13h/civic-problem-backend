import { Router } from "express"
import { verifyJwt } from "../middlwears/auth.middlerware.js"
import { citizenImpact } from "../controller/citizen-impact.controller.js"

const router = Router()

router.use(verifyJwt)

router.route("/").get(citizenImpact)
router.route("/:userId").get(citizenImpact)

export default router
