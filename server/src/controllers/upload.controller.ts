import type { Request, Response } from 'express'
import { asyncRoute, badRequest, forbidden, unauthorized } from '../lib/http.js'
import { storeImage } from '../services/upload.service.js'

const FOLDERS = new Set(['uploads', 'products', 'stickers'])

export const uploadImage = asyncRoute(async (req: Request, res: Response) => {
  if (!req.user) throw unauthorized()
  if (!req.file) throw badRequest('No file received. Send it in the "file" field.')

  const folder = typeof req.query.folder === 'string' ? req.query.folder : 'uploads'
  if (!FOLDERS.has(folder)) throw badRequest(`Unknown upload folder "${folder}".`)

  // Customer photos may only land in their own private folder. Product and
  // sticker artwork is staff-only; otherwise any account could pollute the
  // public catalogue paths.
  const staffFolders = folder === 'products' || folder === 'stickers'
  if (staffFolders && req.user.role === 'customer') {
    throw forbidden('Staff access required for that upload folder.')
  }

  const image = await storeImage(req.user.id, req.file, folder)
  res.status(201).json({ image })
})
