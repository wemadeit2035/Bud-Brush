import { useMemo, useState } from "react";
import {
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

function buildMembershipNumber() {
  const year = new Date().getFullYear();
  const token = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `MBR-${year}-${token}`;
}

export default function MembersView({ members, setMembers, showToast }) {
  const [search, setSearch] = useState("");
  const [staffUser, setStaffUser] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
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

  const handleRegisterMember = async (event) => {
    event.preventDefault();

    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const phone = form.phone.trim();
    const email = form.email.trim();

    if (!firstName || !lastName || !phone) {
      showToast(
        "Missing Fields",
        "First name, last name, and phone are required.",
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

  const handleStatusChange = (memberId, status) => {
    setMembers((currentMembers) =>
      currentMembers.map((member) =>
        member.id === memberId ? { ...member, status } : member,
      ),
    );
  };

  const saveStatusUpdate = async (member) => {
    try {
      const updated = await saveMember({
        ...member,
        updatedBy: staffUser.trim() || "pos-staff",
      });

      setMembers((currentMembers) =>
        currentMembers.map((item) => (item.id === updated.id ? updated : item)),
      );
      showToast(
        "Status Updated",
        `Updated ${member.membershipNumber}.`,
        "success",
      );
    } catch (error) {
      showToast("Update Failed", "Could not update member status.", "error");
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
                <div className="flex items-center gap-2">
                  <select
                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={member.status || "active"}
                    onChange={(event) =>
                      handleStatusChange(member.id, event.target.value)
                    }
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <button
                    type="button"
                    className="rounded-full bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
                    onClick={() => saveStatusUpdate(member)}
                  >
                    Save
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
