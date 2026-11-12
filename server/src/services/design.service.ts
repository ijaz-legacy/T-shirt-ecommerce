import { badRequest, notFound } from '../lib/http.js'
import { db } from '../lib/supabase.js'

const TABLE = 'saved_designs'

export interface SavedDesign {
  id: string
  name: string
  created_at: string
  fit: string
  size: string
  colorId: string
  placements: unknown[]
}

export interface DesignInput {
  name: string
  fit: string
  size: string
  colorId: string
  placements: unknown[]
}

function rowToDesign(row: Record<string, unknown>): SavedDesign {
  return {
    id: String(row.id),
    name: String(row.name ?? 'Untitled design'),
    created_at: String(row.created_at ?? new Date().toISOString()),
    fit: String(row.fit ?? ''),
    size: String(row.size ?? ''),
    colorId: String(row.color_id ?? ''),
    placements: (row.placements as unknown[]) ?? [],
  }
}

export async function listDesigns(userId: string): Promise<SavedDesign[]> {
  const { data, error } = await db()
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map(row => rowToDesign(row as Record<string, unknown>))
}

export async function createDesign(userId: string, input: DesignInput): Promise<SavedDesign> {
  const { data, error } = await db()
    .from(TABLE)
    .insert({
      user_id: userId,
      name: input.name.trim() || 'Untitled design',
      fit: input.fit,
      size: input.size,
      color_id: input.colorId,
      placements: input.placements,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return rowToDesign(data as Record<string, unknown>)
}

export async function deleteDesign(userId: string, id: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw badRequest('Invalid design id.')
  // The user_id filter is what stops one customer deleting another's design.
  const { error, count } = await db()
    .from(TABLE)
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
  if (!count) throw notFound('Design not found.')
}
