import { Router } from 'express'
import { signup, login } from '../controllers/auth.controller.js'
import { catchAsync } from '../utils/catchAsync.js'

const router = Router()

router.post("/signup", catchAsync(signup))
router.post("/login", catchAsync(login))

export default router