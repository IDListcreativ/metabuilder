import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';

function buildLoginRedirect(origin: string, errorMessage?: string, errorCode?: string) {
  const loginUrl = new URL('/sign-up-login-screen', origin);
  if (errorMessage) loginUrl.searchParams.set('authError', errorMessage);
  if (errorCode) loginUrl.searchParams.set('authErrorCode', errorCode);
  return loginUrl;
}

function sanitizeNextPath(nextValue: string | null): string {
  if (!nextValue || !nextValue.startsWith('/')) return '/ai-code-generator';
  if (nextValue.startsWith('//')) return '/ai-code-generator';
  return nextValue;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = sanitizeNextPath(searchParams.get('next'));
  const providerError = searchParams.get('error');
  const providerErrorDescription = searchParams.get('error_description');

  if (providerError || providerErrorDescription) {
    const loginUrl = buildLoginRedirect(
      origin,
      providerErrorDescription ?? 'Google sign-in failed before the app received a valid session.',
      providerError ?? 'provider_error'
    );
    return NextResponse.redirect(loginUrl);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error('Supabase auth callback exchange failed:', error.message);
    return NextResponse.redirect(
      buildLoginRedirect(
        origin,
        error.message || 'Google sign-in could not be completed.',
        'callback_exchange_failed'
      )
    );
  }

  return NextResponse.redirect(
    buildLoginRedirect(
      origin,
      'Google sign-in did not return an authorization code.',
      'missing_code'
    )
  );
}
