import AuthScreen from './components/AuthScreen';

interface SignUpLoginPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function getQueryValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function SignUpLoginPage({ searchParams }: SignUpLoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  return (
    <AuthScreen
      authError={getQueryValue(resolvedSearchParams?.authError)}
      authErrorCode={getQueryValue(resolvedSearchParams?.authErrorCode)}
    />
  );
}
