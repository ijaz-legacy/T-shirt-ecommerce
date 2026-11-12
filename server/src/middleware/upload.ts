import multer from 'multer'
import { HttpError } from '../lib/http.js'

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/avif'])

/** Single image upload held in memory, then pushed to Supabase Storage. */
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED.has(file.mimetype)) {
      callback(new HttpError(415, 'Only PNG, JPEG, WebP or AVIF images are accepted.'))
      return
    }
    callback(null, true)
  },
})
