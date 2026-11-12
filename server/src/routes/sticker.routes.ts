import { Router } from 'express'
import {
  createSticker,
  deleteSticker,
  listStickers,
  updateSticker,
} from '../controllers/sticker.controller.js'
import { requireAuth, requireStaff } from '../middleware/auth.js'

export const stickerRouter = Router()

stickerRouter.get('/', listStickers)

stickerRouter.post('/', requireAuth, requireStaff, createSticker)
stickerRouter.patch('/:id', requireAuth, requireStaff, updateSticker)
stickerRouter.delete('/:id', requireAuth, requireStaff, deleteSticker)
