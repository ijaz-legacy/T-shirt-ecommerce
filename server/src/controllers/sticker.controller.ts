import type { Request, Response } from 'express'
import { z } from 'zod'
import { asyncRoute } from '../lib/http.js'
import * as stickers from '../services/sticker.service.js'

const stickerBodySchema = z.object({
  nameEn: z.string().trim().min(1, 'nameEn is required.').max(120),
  nameTa: z.string().trim().max(200).optional(),
  imageUrl: z.string().trim().min(1, 'imageUrl is required.').max(2000),
  category: z.enum(['small', 'medium', 'large']).optional(),
  active: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(100_000).optional(),
})

const stickerPatchSchema = stickerBodySchema.partial()

export const listStickers = asyncRoute(async (req: Request, res: Response) => {
  const includeInactive = req.query.includeInactive === 'true'
  const data = await stickers.listStickers({
    includeInactive: includeInactive && req.user?.role !== 'customer',
  })
  res.json({ stickers: data })
})

export const createSticker = asyncRoute(async (req: Request, res: Response) => {
  const input = stickerBodySchema.parse(req.body)
  const sticker = await stickers.createSticker(input)
  res.status(201).json({ sticker })
})

export const updateSticker = asyncRoute(async (req: Request, res: Response) => {
  const patch = stickerPatchSchema.parse(req.body)
  const sticker = await stickers.updateSticker(req.params.id, patch)
  res.json({ sticker })
})

export const deleteSticker = asyncRoute(async (req: Request, res: Response) => {
  await stickers.deleteSticker(req.params.id)
  res.status(204).end()
})
