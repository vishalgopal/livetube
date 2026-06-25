"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { ArrowRight, RefreshCw, AlertCircle } from "lucide-react";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    try {
      const { error: signUpError } = await authClient.signUp.email({
        email,
        password,
        name,
        callbackURL: "/",
      });

      if (signUpError) {
        setError(signUpError.message || "Failed to create account.");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas p-6 md:p-8">
      {/* Mesh background effect at top/center */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[800px] h-[300px] opacity-10 bg-mesh-gradient blur-[120px] pointer-events-none rounded-full" />

      <div className="w-full max-w-[400px] flex flex-col gap-6 relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 flex items-center justify-center bg-primary rounded-xl text-on-primary font-bold text-xl shadow-md">
            L
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink mt-2">
            Create Operator Account
          </h1>
          <p className="text-sm text-mute">
            Sign up to get access to the LiveTube panel
          </p>
        </div>

        {/* Card Panel */}
        <div className="p-6 md:p-8 rounded-xl border border-hairline bg-canvas/60 backdrop-blur-md shadow-xs">
          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-error-soft/30 border border-error-soft text-error-deep text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-xs font-semibold text-body">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas focus:outline-none focus:border-hairline-strong focus:ring-1 focus:ring-primary text-sm transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-xs font-semibold text-body">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@livetube.io"
                className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas focus:outline-none focus:border-hairline-strong focus:ring-1 focus:ring-primary text-sm transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-body">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas focus:outline-none focus:border-hairline-strong focus:ring-1 focus:ring-primary text-sm transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirmPassword" className="text-xs font-semibold text-body">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg border border-hairline bg-canvas focus:outline-none focus:border-hairline-strong focus:ring-1 focus:ring-primary text-sm transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-primary hover:bg-ink text-on-primary text-sm font-semibold shadow-xs transition-colors cursor-pointer"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Register <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-mute">
          Already have an account?{" "}
          <Link href="/login" className="text-ink font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
