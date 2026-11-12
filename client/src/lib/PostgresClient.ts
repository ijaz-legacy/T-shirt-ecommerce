// IJAZ LEGACY — the browser-side Postgres Cloud adapter has been removed.
//
// It used to read VITE_POSTGRES_URL, a full connection string such as
// `postgresql://user:password@host:5432/dbname`. Vite inlines VITE_* variables
// into the public JavaScript bundle, so that deployed a database password to
// every visitor. It also accepted an `anonKey` that was really the database
// user name and verified tokens in the browser, which is not a trust boundary.
//
// Database access now runs exclusively through the Express API in `server/`:
// the API verifies the Supabase access token on the server and holds the
// service-role key there. The browser only ever receives the public anon key.
//
// This module is intentionally empty; nothing imports it anymore.

export {}
