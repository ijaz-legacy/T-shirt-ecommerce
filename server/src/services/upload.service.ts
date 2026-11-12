import { randomUUID } from 'node:crypto'
import { env } from '../config/env.js'
import { badRequest } from '../lib/http.js'
import { storage } from '../lib/supabase.js'

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/avif': 'avif',
}

export interface StoredImage {
  path: string
  publicUrl: string
  bytes: number
  contentType: string
}

export async function storeImage(
  userId: string,
  file: Express.Multer.File,
  folder = 'uploads',
): Promise<StoredImage> {
  const extension = EXTENSIONS[file.mimetype] ?? 'webp'
  const path = `${folder}/${userId}/${randomUUID()}.${extension}`
  const bucket = storage().storage.from(env.storageBucket)

  const { error } = await bucket.upload(path, file.buffer, {
    contentType: file.mimetype,
    upsert: false,
  })

  if (error) {
    throw badRequest(
      `Upload failed: ${error.message}. Make sure the "${env.storageBucket}" bucket exists and allows writes.`,
    )
  }

  const { data } = bucket.getPublicUrl(path)
  return {
    path,
    publicUrl: data.publicUrl,
    bytes: file.size,
    contentType: file.mimetype,
  }
}
