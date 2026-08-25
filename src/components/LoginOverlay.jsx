import { useState } from "react";
import { signInWithEmail } from "../services/database";

export default function LoginOverlay({ visible, onAuthenticate }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!visible) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const session = await signInWithEmail(email, password);
      await onAuthenticate(session);
    } catch (submitError) {
      setError(submitError.message || "Unable to sign in.");
      setPassword("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <img
            src="/b-b.png"
            alt="Bud & Brush"
            className="mx-auto mb-4 h-20 w-20 object-cover"
          />
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            type="email"
            autoComplete="email"
            placeholder="Email address"
            className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-sky-400"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-sky-400"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {error && (
            <div className="rounded-3xl bg-rose-100 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}
          <button
            type="submit"
            className="w-full rounded-3xl bg-slate-900 px-4 py-3 text-white hover:bg-slate-800"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
