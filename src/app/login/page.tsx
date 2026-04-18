import LoginForm from "./login-form";

type LoginPageProps = {
  searchParams: Promise<{
    callbackUrl?: string;
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedParams = await searchParams;
  const callbackUrl = resolvedParams.callbackUrl || "/admin";
  const errorCode = resolvedParams.error;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#f8fbff_0%,_#e0f2fe_40%,_#bfdbfe_100%)] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-xl">
        <h1 className="text-2xl font-semibold text-slate-900">Admin Login</h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in to access the admin dashboard.
        </p>

        <LoginForm callbackUrl={callbackUrl} initialErrorCode={errorCode} />
      </div>
    </main>
  );
}
