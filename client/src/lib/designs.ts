import { supabase } from './supabase'
import type { CustomConfig } from './types'

/** A custom tee the user saved to "Your designs". */
export interface SavedDesign extends CustomConfig {
  id: string
  name: string
  created_at: string
}

const TABLE = 'saved_designs'

function localKey(userId: string) { return `ijaz_designs:${userId}` }

function readLocal(userId: string): SavedDesign[] {
  try {
    const raw = localStorage.getItem(localKey(userId))
    return raw ? (JSON.parse(raw) as SavedDesign[]) : []
  } catch {
    return []
  }
}

function writeLocal(userId: string, list: SavedDesign[]) {
  try { localStorage.setItem(localKey(userId), JSON.stringify(list)) } catch { /* quota / private mode */ }
}

function localId() { return `local-${Math.random().toString(36).slice(2, 10)}` }

/** Supabase returns snake_case columns; the app works with camelCase config. */
function rowToDesign(row: Record<string, unknown>): SavedDesign {
  return {
    id: String(row.id),
    name: String(row.name ?? 'Untitled design'),
    created_at: String(row.created_at ?? new Date().toISOString()),
    fit: row.fit as SavedDesign['fit'],
    size: row.size as SavedDesign['size'],
    colorId: row.color_id as SavedDesign['colorId'],
    placements: (row.placements as SavedDesign['placements']) ?? [],
  }
}

/**
 * Lists the signed-in user's saved designs.
 * If the `saved_designs` table hasn't been created yet, designs are kept in
 * this browser instead so the feature still works — `localOnly` says which.
 */
export async function listDesigns(userId?: string | null): Promise<{ designs: SavedDesign[]; localOnly: boolean }> {
  const uid = userId || 'guest'
  if (uid === 'guest') {
    return { designs: readLocal('guest'), localOnly: true }
  }

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })

    if (error) {
      const locals = readLocal(uid)
      return { designs: locals, localOnly: true }
    }

    const remoteDesigns = (data ?? []).map(rowToDesign)
    const localDesigns = readLocal(uid)
    // Merge by id so local-only drafts also show up
    const ids = new Set(remoteDesigns.map(d => d.id))
    const merged = [...remoteDesigns, ...localDesigns.filter(d => !ids.has(d.id))]
    return { designs: merged, localOnly: false }
  } catch {
    return { designs: readLocal(uid), localOnly: true }
  }
}

export async function saveDesign(
  userId: string | null | undefined,
  name: string,
  config: CustomConfig,
): Promise<{ design: SavedDesign; localOnly: boolean }> {
  const uid = userId || 'guest'
  const safeConfig: CustomConfig = {
    fit: config.fit || 'regular',
    size: config.size || 'M',
    colorId: config.colorId || 'cream',
    placements: config.placements || [],
  }
  const cleanName = (name || '').trim() || `Tee Design · ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`

  if (uid === 'guest') {
    const design: SavedDesign = { ...safeConfig, id: localId(), name: cleanName, created_at: new Date().toISOString() }
    writeLocal('guest', [design, ...readLocal('guest')])
    return { design, localOnly: true }
  }

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        user_id: uid,
        name: cleanName,
        fit: safeConfig.fit,
        size: safeConfig.size,
        color_id: safeConfig.colorId,
        placements: safeConfig.placements,
      })
      .select('*')
      .single()

    if (!error && data) {
      const design = rowToDesign(data)
      writeLocal(uid, [design, ...readLocal(uid).filter(d => d.id !== design.id)])
      return { design, localOnly: false }
    }
  } catch (err) {
    console.warn('Supabase save failed, saving locally:', err)
  }

  const design: SavedDesign = { ...safeConfig, id: localId(), name: cleanName, created_at: new Date().toISOString() }
  writeLocal(uid, [design, ...readLocal(uid)])
  return { design, localOnly: true }
}

export async function deleteDesign(userId: string | null | undefined, id: string): Promise<void> {
  const uid = userId || 'guest'
  if (id.startsWith('local-') || uid === 'guest') {
    writeLocal(uid, readLocal(uid).filter(d => d.id !== id))
    return
  }
  try {
    const { error } = await supabase.from(TABLE).delete().eq('id', id).eq('user_id', uid)
    if (error) writeLocal(uid, readLocal(uid).filter(d => d.id !== id))
    else writeLocal(uid, readLocal(uid).filter(d => d.id !== id))
  } catch {
    writeLocal(uid, readLocal(uid).filter(d => d.id !== id))
  }
}
