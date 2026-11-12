import type { Request, Response } from 'express'
import { z } from 'zod'
import { unauthorized } from '../lib/http.js'
import { asyncRoute } from '../lib/http.js'
import * as designs from '../services/design.service.js'

const placementSchema = z.object({
  ref: z.string().min(1),
  x: z.number(),
  y: z.number(),
  scale: z.number(),
  rotation: z.number(),
}).passthrough()

const designBodySchema = z.object({
  name: z.string().trim().max(60).optional().default('Untitled design'),
  fit: z.string().trim().min(1),
  size: z.string().trim().min(1),
  colorId: z.string().trim().min(1),
  placements: z.array(placementSchema).max(10),
})

export const listDesigns = asyncRoute(async (req: Request, res: Response) => {
  if (!req.user) throw unauthorized()
  const data = await designs.listDesigns(req.user.id)
  res.json({ designs: data })
})

export const createDesign = asyncRoute(async (req: Request, res: Response) => {
  if (!req.user) throw unauthorized()
  const input = designBodySchema.parse(req.body)
  const design = await designs.createDesign(req.user.id, input)
  res.status(201).json({ design })
})

export const deleteDesign = asyncRoute(async (req: Request, res: Response) => {
  if (!req.user) throw unauthorized()
  await designs.deleteDesign(req.user.id, req.params.id)
  res.status(204).end()
})
