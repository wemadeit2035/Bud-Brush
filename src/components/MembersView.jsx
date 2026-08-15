import { useMemo, useState } from "react";
import {
  deleteMember,
  findMemberByPhoneOrMembershipNumber,
  saveMember,
  saveMemberConsent,
} from "../services/database";

const CONSENT_VERSION = "v1.0";

function validatePhone(phone) {
  const normalized = String(phone || "").replace(/\s+/g, "");
  return /^(?:\+27|0)[6-8][0-9]{8}$/.test(normalized);
}

function validateEmail(email) {
  if (!email) return true;
  const normalized = String(email).trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

function validateIdNumber(idNumber) {
  const normalized = String(idNumber || "").trim();
  return /^[0-9A-Za-z]{6,20}$/.test(normalized);
}

function buildMembershipNumber() {
  const year = new Date().getFullYear();
  const token = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `MBR-${year}-${token}`;
}

export default function MembersView({
  members,
  setMembers,
  transactions = [],
  showToast,
}) {
  const [search, setSearch] = useState("");
  const [staffUser, setStaffUser] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    idNumber: "",
    dateOfBirth: "",
  });

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return members;

    return members.filter((member) => {
      return (
        String(member.membershipNumber || "")
          .toLowerCase()
          .includes(query) ||
        `${member.firstName} ${member.lastName}`
          .toLowerCase()
          .includes(query) ||
        String(member.phone || "")
          .toLowerCase()
          .includes(query) ||
        String(member.email || "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [members, search]);

  const updateFormField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const selectedMember = useMemo(
    () => members.find((member) => member.id === selectedMemberId) || null,
    [members, selectedMemberId],
  );

  const memberContributions = useMemo(() => {
    const totals = new Map();
    transactions.forEach((tx) => {
      if (!tx.memberId) return;
      totals.set(tx.memberId, (totals.get(tx.memberId) || 0) + (tx.total || 0));
    });
    return totals;
  }, [transactions]);

  const getMemberTotalContribution = (memberId) =>
    memberContributions.get(memberId) || 0;

  const selectedMemberTransactions = useMemo(() => {
    if (!selectedMemberId) return [];
    return transactions
      .filter((tx) => tx.memberId === selectedMemberId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, selectedMemberId]);

  const handleRegisterMember = async (event) => {
    event.preventDefault();

    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const phone = form.phone.trim();
    const email = form.email.trim();
    const idNumber = form.idNumber.trim();

    if (!firstName || !lastName || !phone || !idNumber) {
      showToast(
        "Missing Fields",
        "First name, last name, phone, and ID number are required.",
        "warning",
      );
      return;
    }

    if (!validatePhone(phone)) {
      showToast(
        "Invalid Phone",
        "Use a valid South African mobile number, e.g. 0821234567 or +27821234567.",
        "warning",
      );
      return;
    }

    if (!validateIdNumber(idNumber)) {
      showToast(
        "Invalid ID Number",
        "Enter a valid ID number (6-20 alphanumeric characters).",
        "warning",
      );
      return;
    }

    if (!validateEmail(email)) {
      showToast(
        "Invalid Email",
        "Enter a valid email address or leave it blank.",
        "warning",
      );
      return;
    }

    if (!consentAccepted) {
      showToast(
        "Consent Required",
        "Member consent must be accepted before saving.",
        "warning",
      );
      return;
    }

    try {
      const existingByPhone = await findMemberByPhoneOrMembershipNumber(phone);
      if (existingByPhone?.id) {
        showToast(
          "Already Registered",
          `A member with phone ${phone} already exists (${existingByPhone.membershipNumber}).`,
          "info",
        );
        return;
      }

      const savedMember = await saveMember({
        membershipNumber: buildMembershipNumber(),
        firstName,
        lastName,
        phone,
        email,
        idNumber,
        dateOfBirth: form.dateOfBirth || null,
        status: "active",
        consentVersion: CONSENT_VERSION,
        consentSignedAt: new Date().toISOString(),
        createdBy: staffUser.trim() || "pos-staff",
        updatedBy: staffUser.trim() || "pos-staff",
      });

      await saveMemberConsent({
        memberId: savedMember.id,
        consentVersion: CONSENT_VERSION,
        signedAt: new Date().toISOString(),
        signedByStaff: staffUser.trim() || "pos-staff",
        formSnapshot: {
          firstName,
          lastName,
          phone,
          email: email || null,
          idNumber,
          dateOfBirth: form.dateOfBirth || null,
          status: "active",
        },
      });

      setMembers((currentMembers) => [savedMember, ...currentMembers]);
      setForm({
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        idNumber: "",
        dateOfBirth: "",
      });
      setConsentAccepted(false);

      showToast(
        "Member Saved",
        `${savedMember.firstName} ${savedMember.lastName} registered (${savedMember.membershipNumber}).`,
        "success",
      );
    } catch (error) {
      showToast(
        "Save Failed",
        "Unable to save this member. Check Supabase schema and RLS.",
        "error",
      );
    }
  };

  const handleRemoveMember = async (member) => {
    const confirmed = window.confirm(
      `Remove ${member.firstName} ${member.lastName} (${member.membershipNumber})? This cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      await deleteMember(member.id);
      setMembers((currentMembers) =>
        currentMembers.filter((item) => item.id !== member.id),
      );
      if (selectedMemberId === member.id) {
        setSelectedMemberId(null);
      }
      showToast(
        "Member Removed",
        `${member.firstName} ${member.lastName} was removed.`,
        "success",
      );
    } catch (error) {
      showToast("Remove Failed", "Could not remove this member.", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <img src="/inventory.svg" alt="Members icon" className="h-5 w-5" />
          Members
        </h2>

        <form className="space-y-4" onSubmit={handleRegisterMember}>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="text"
              placeholder="First name *"
              className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3"
              value={form.firstName}
              onChange={(event) =>
                updateFormField("firstName", event.target.value)
              }
            />
            <input
              type="text"
              placeholder="Last name *"
              className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3"
              value={form.lastName}
              onChange={(event) =>
                updateFormField("lastName", event.target.value)
              }
            />
            <input
              type="tel"
              placeholder="Phone * (0821234567)"
              className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3"
              value={form.phone}
              onChange={(event) => updateFormField("phone", event.target.value)}
            />
            <input
              type="text"
              placeholder="ID number *"
              className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3"
              value={form.idNumber}
              onChange={(event) =>
                updateFormField("idNumber", event.target.value)
              }
            />
            <input
              type="email"
              placeholder="Email (optional)"
              className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3"
              value={form.email}
              onChange={(event) => updateFormField("email", event.target.value)}
            />
            <input
              type="date"
              className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3"
              value={form.dateOfBirth}
              onChange={(event) =>
                updateFormField("dateOfBirth", event.target.value)
              }
            />
            <input
              type="text"
              placeholder="Staff username for audit"
              className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3"
              value={staffUser}
              onChange={(event) => setStaffUser(event.target.value)}
            />
          </div>

          <label className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={consentAccepted}
              onChange={(event) => setConsentAccepted(event.target.checked)}
              className="mt-1"
            />
            <span>
              Member confirms consent form acceptance and POPIA data-processing
              notice. Consent version: {CONSENT_VERSION}
            </span>
          </label>

          <button
            type="submit"
            className="rounded-3xl bg-slate-900 px-5 py-3 text-white hover:bg-slate-800"
          >
            Register Member
          </button>
        </form>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold">Existing Members</h3>
          <input
            type="text"
            placeholder="Search by name, phone, email, or member number"
            className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 sm:max-w-md"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {filteredMembers.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            No members found.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="font-semibold text-slate-900">
                    {member.firstName} {member.lastName}
                  </div>
                  <div className="text-sm text-slate-500">
                    {member.membershipNumber} | {member.phone}
                    {member.email ? ` | ${member.email}` : ""}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700 hover:bg-slate-200"
                    onClick={() =>
                      setSelectedMemberId((currentId) =>
                        currentId === member.id ? null : member.id,
                      )
                    }
                  >
                    {selectedMemberId === member.id ? "Hide" : "View"}
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-rose-50 px-4 py-2 text-sm text-rose-700 hover:bg-rose-100"
                    onClick={() => handleRemoveMember(member)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedMember && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold">Member Details</h3>
            <button
              type="button"
              className="text-sm text-slate-500 hover:text-slate-700"
              onClick={() => setSelectedMemberId(null)}
            >
              Close
            </button>
          </div>

          <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-2">
            <div>
              <span className="text-slate-400">Name</span>
              <div className="font-semibold">
                {selectedMember.firstName} {selectedMember.lastName}
              </div>
            </div>
            <div>
              <span className="text-slate-400">Membership Number</span>
              <div className="font-semibold">
                {selectedMember.membershipNumber}
              </div>
            </div>
            <div>
              <span className="text-slate-400">Phone</span>
              <div className="font-semibold">{selectedMember.phone}</div>
            </div>
            <div>
              <span className="text-slate-400">Email</span>
              <div className="font-semibold">{selectedMember.email || "-"}</div>
            </div>
            <div>
              <span className="text-slate-400">ID Number</span>
              <div className="font-semibold">
                {selectedMember.idNumber || "-"}
              </div>
            </div>
            <div>
              <span className="text-slate-400">Date of Birth</span>
              <div className="font-semibold">
                {selectedMember.dateOfBirth || "-"}
              </div>
            </div>
            <div>
              <span className="text-slate-400">Status</span>
              <div className="font-semibold capitalize">
                {selectedMember.status}
              </div>
            </div>
            <div>
              <span className="text-slate-400">
                Total Historical Contribution
              </span>
              <div className="text-lg font-semibold text-emerald-600">
                R{getMemberTotalContribution(selectedMember.id).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="mb-2 text-sm font-semibold text-slate-600">
              Purchase History ({selectedMemberTransactions.length})
            </h4>
            {selectedMemberTransactions.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
                No transactions recorded for this member yet.
              </div>
            ) : (
              <div className="space-y-2">
                {selectedMemberTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                  >
                    <span className="text-slate-500">
                      {new Date(tx.date).toLocaleString()}
                    </span>
                    <span className="text-slate-500">{tx.payment}</span>
                    <span className="font-semibold">
                      R{Number(tx.total || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
