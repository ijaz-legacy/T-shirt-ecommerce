import { Router } from 'express'
import {
  createDesign,
  deleteDesign,
  listDesigns,
} from '../controllers/design.controller.js'
import { requireAuth } from '../middleware/auth.js'

export const designRouter = Router()

designRouter.use(requireAuth)

designRouter.get('/', listDesigns)
designRouter.post('/', createDesign)
designRouter.delete('/:id', deleteDesign)
