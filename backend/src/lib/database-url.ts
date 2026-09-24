/** Preserve pg 8's certificate + hostname verification when pg changes its defaults.
 * Explicit libpq compatibility and local/socket connections are left untouched.
 * Never log the returned URL: it contains credentials.
 */
export function normalizeDatabaseSsl(connectionString: string): string {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    return connectionString;
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) return connectionString;
  if (url.searchParams.get('uselibpqcompat') === 'true') return connectionString;
  const mode = url.searchParams.get('sslmode');
  if (!mode || !['prefer', 'require', 'verify-ca'].includes(mode)) return connectionString;
  url.searchParams.set('sslmode', 'verify-full');
  return url.toString();
}
