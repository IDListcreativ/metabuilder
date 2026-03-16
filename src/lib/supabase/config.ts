function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function requireFirstEnv(names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  throw new Error(`Missing required environment variable. Expected one of: ${names.join(', ')}`);
}

function normalizeUrl(url: string): string {
  return url.replace(/^https?:\/\/https?:\/\//i, (match) =>
    match.toLowerCase().startsWith('https://') ? 'https://' : 'http://'
  );
}

export function getSupabaseUrl(): string {
  return normalizeUrl(requireEnv('NEXT_PUBLIC_SUPABASE_URL'));
}

export function getSupabaseAnonKey(): string {
  return requireFirstEnv([
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY',
  ]);
}

export function getPublicSiteUrl(): string | null {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!siteUrl) return null;
  return siteUrl.replace(/\/+$/, '');
}
