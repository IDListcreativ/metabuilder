function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
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
  return requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export function getPublicSiteUrl(): string | null {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!siteUrl) return null;
  return siteUrl.replace(/\/+$/, '');
}
