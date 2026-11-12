import { Router } from 'express'
import { uploadImage } from '../controllers/upload.controller.js'
import { requireAuth } from '../middleware/auth.js'
import { imageUpload } from '../middleware/upload.js'

export const uploadRouter = Router()

uploadRouter.post('/', requireAuth, imageUpload.single('file'), uploadImage)
