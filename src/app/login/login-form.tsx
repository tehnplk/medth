"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

const errorMessageByType: Record<string, string> = {
  CredentialsSignin: "Invalid username or password.",
  AccessDenied: "You are not allowed to sign in.",
  Configuration: "Authentication is not configured correctly.",
};

type LoginFormProps = {
  callbackUrl: string;
  initialErrorCode?: string;
};

export default function LoginForm({ callbackUrl, initialErrorCode }: LoginFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const initialError = initialErrorCode
    ? (errorMessageByType[initialErrorCode] ?? "Unable to sign in.")
    : "";
  const visibleError = submitError || initialError;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const username = formData.get("username");
    const password = formData.get("password");

    if (typeof username !== "string" || typeof password !== "string") {
      setSubmitError("Please enter username and password.");
      setIsSubmitting(false);
      return;
    }

    const result = await signIn("credentials", {
      username,
      password,
      callbackUrl,
      redirect: false,
    });

    setIsSubmitting(false);

    if (result?.error) {
      if (result.error === "User account is suspended") {
        setSubmitError("User ถูกระงับใช้งาน");
      } else {
        setSubmitError(errorMessageByType[result.error] ?? "Unable to sign in.");
      }
      return;
    }

    router.push(result?.url || callbackUrl);
    router.refresh();
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={onSubmit}>
      {visibleError ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {visibleError}
        </p>
      ) : null}

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Username</span>
        <input
          name="username"
          type="text"
          required
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-sky-300 transition focus:ring-2"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
        <input
          name="password"
          type="password"
          required
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-sky-300 transition focus:ring-2"
        />
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}

