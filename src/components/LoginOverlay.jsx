import { useState } from "react";

export default function LoginOverlay({ visible, onAuthenticate }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  if (!visible) return null;

  const handleSubmit = () => {
    if (password === "admin" || password === "password") {
      onAuthenticate();
      return;
    }
    setError(true);
    setPassword("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <img
            src="/b-b.png"
            alt="Bud & Brush"
            className="mx-auto mb-4 h-20 w-20 rounded-3xl object-cover"
          />
          <h1 className="text-3xl font-semibold">Bud & Brush</h1>
          <p className="text-slate-500">Point of Sale System</p>
        </div>
        <div className="space-y-4">
          <input
            type="password"
            placeholder="Enter admin password"
            className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-sky-400"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error && (
            <div className="rounded-3xl bg-rose-100 px-4 py-3 text-sm text-rose-700">
              Invalid password. Use "admin" or "password".
            </div>
          )}
          <button
            type="button"
            className="w-full rounded-3xl bg-slate-900 px-4 py-3 text-white hover:bg-slate-800"
            onClick={handleSubmit}
          >
            Access POS
          </button>
        </div>
      </div>
    </div>
  );
}
