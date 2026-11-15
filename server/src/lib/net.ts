import { setDefaultResultOrder } from 'node:dns'

/**
 * Prefer IPv4 for outbound connections.
 *
 * Node 18+ resolves both A and AAAA records and races them (Happy Eyeballs).
 * On some hosts — Render's free instances are a known case — the IPv6 route to
 * Supabase black-holes, so every request dies with the unhelpful
 * `TypeError: fetch failed` after the connection timeout even though the
 * database is perfectly reachable. Pinning IPv4 makes those calls work.
 *
 * Must be imported before any HTTP client is created.
 */
setDefaultResultOrder('ipv4first')
