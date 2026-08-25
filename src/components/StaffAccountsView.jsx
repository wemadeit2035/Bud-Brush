import { useEffect, useState } from "react";
import { createStaffAccount, loadStaffAccounts } from "../services/database";

export default function StaffAccountsView({ showToast }) {
  const [accounts, setAccounts] = useState([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("staff");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refreshAccounts = async () => {
    setIsLoading(true);
    try {
      setAccounts(await loadStaffAccounts());
    } catch (error) {
      showToast(
        "Accounts unavailable",
        "Unable to load staff accounts.",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAccounts();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTemporaryPassword("");
    setIsSubmitting(true);

    try {
      const account = await createStaffAccount(email, role);
      setTemporaryPassword(account.temporaryPassword);
      setEmail("");
      await refreshAccounts();
      showToast("Account created", `Created ${account.email}.`, "success");
    } catch (error) {
      showToast(
        "Account not created",
        error.message || "Unable to create the account.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
      <form
        className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        onSubmit={handleSubmit}
      >
        <h2 className="mb-5 text-lg font-semibold">Create Account</h2>
        <div className="space-y-4">
          <input
            type="email"
            autoComplete="off"
            placeholder="Email address"
            className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <select
            className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3"
            value={role}
            onChange={(event) => setRole(event.target.value)}
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            className="w-full rounded-3xl bg-slate-900 px-4 py-3 text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create account"}
          </button>
        </div>
        {temporaryPassword && (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <div className="font-semibold">One-time password</div>
            <code className="mt-2 block break-all rounded bg-white px-3 py-2 text-slate-900">
              {temporaryPassword}
            </code>
          </div>
        )}
      </form>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-semibold">Accounts</h2>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading accounts...</p>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-slate-500">No staff accounts yet.</p>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => (
              <div
                key={account.user_id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 text-sm last:border-0"
              >
                <span className="break-all font-medium text-slate-900">
                  {account.email}
                </span>
                <span className="rounded-full bg-sky-100 px-3 py-1 capitalize text-sky-800">
                  {account.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
