"use client";

import { startTransition, useState } from "react";
import { Pencil, Plus, Trash2, User } from "lucide-react";
import Swal from "sweetalert2";
import AdminModal from "@/components/admin-modal";

type UserRow = {
  id: number;
  username: string;
  display_name: string;
  email: string | null;
  role: "admin" | "user";
  is_active: number;
  created_at: string;
};

type BranchOption = {
  id: number;
  name: string;
};

type UserBranchRow = {
  user_id: number;
  branch_id: number;
};

type UserForm = {
  username: string;
  display_name: string;
  email: string;
  password: string;
  role: "admin" | "user";
  is_active: boolean;
};

const emptyForm: UserForm = {
  username: "",
  display_name: "",
  email: "",
  password: "",
  role: "user",
  is_active: true,
};

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const data = (await response.json()) as T & { error?: string };

  if (!response.ok) throw new Error(data.error ?? "เกิดข้อผิดพลาด");
  return data;
}

function toForm(row: UserRow): UserForm {
  return {
    username: row.username,
    display_name: row.display_name,
    email: row.email ?? "",
    password: "",
    role: row.role,
    is_active: row.is_active === 1,
  };
}

export default function AdminUsersGrid({
  initialUsers,
  branches,
  initialUserBranches,
}: {
  initialUsers: UserRow[];
  branches: BranchOption[];
  initialUserBranches: UserBranchRow[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [userBranches, setUserBranches] = useState(initialUserBranches);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [form, setForm] = useState<UserForm>({ ...emptyForm });
  const [open, setOpen] = useState(false);
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [branchModalUser, setBranchModalUser] = useState<UserRow | null>(null);
  const [selectedBranchIds, setSelectedBranchIds] = useState<number[]>([]);
  const [isSavingBranches, setIsSavingBranches] = useState(false);

  function openCreateModal() {
    setEditingUser(null);
    setForm({ ...emptyForm });
    setError("");
    setOpen(true);
  }

  function openEditModal(row: UserRow) {
    setEditingUser(row);
    setForm(toForm(row));
    setError("");
    setOpen(true);
  }

  function closeModal() {
    if (isSaving) return;
    setOpen(false);
    setEditingUser(null);
    setError("");
  }

  function updateForm<Key extends keyof UserForm>(key: Key, value: UserForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    try {
      if (editingUser) {
        const payload = {
          display_name: form.display_name,
          email: form.email || null,
          role: form.role,
          is_active: form.is_active ? 1 : 0,
          ...(form.password ? { password: form.password } : {}),
        };

        const result = await requestJson<{ row: UserRow }>(`/api/admin/users/${editingUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        startTransition(() => {
          setUsers((current) =>
            current.map((user) => (user.id === result.row.id ? result.row : user)),
          );
        });
      } else {
        const payload = {
          username: form.username,
          display_name: form.display_name,
          email: form.email || null,
          password: form.password,
          role: form.role,
          is_active: form.is_active ? 1 : 0,
        };

        const result = await requestJson<{ row: UserRow }>("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        startTransition(() => {
          setUsers((current) => [...current, result.row]);
        });
      }

      closeModal();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(row: UserRow) {
    const result = await Swal.fire({
      title: "ยืนยันการลบ",
      text: `ลบผู้ใช้งาน "${row.display_name}" ใช่หรือไม่`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
    });
    if (!result.isConfirmed) return;

    try {
      setError("");
      await requestJson<{ success: true }>(`/api/admin/users/${row.id}`, { method: "DELETE" });
      startTransition(() => {
        setUsers((current) => current.filter((item) => item.id !== row.id));
        setUserBranches((current) => current.filter((ub) => ub.user_id !== row.id));
      });
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "ลบข้อมูลไม่สำเร็จ");
    }
  }

  function getUserBranchIds(userId: number): number[] {
    return userBranches.filter((ub) => ub.user_id === userId).map((ub) => ub.branch_id);
  }

  function openBranchModal(row: UserRow) {
    setBranchModalUser(row);
    setSelectedBranchIds(getUserBranchIds(row.id));
    setBranchModalOpen(true);
  }

  function closeBranchModal() {
    if (isSavingBranches) return;
    setBranchModalOpen(false);
    setBranchModalUser(null);
    setSelectedBranchIds([]);
  }

  async function handleSaveBranches() {
    if (!branchModalUser) return;
    setIsSavingBranches(true);

    try {
      await requestJson<{ success: true }>(`/api/admin/users/${branchModalUser.id}/branches`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branch_ids: selectedBranchIds }),
      });

      // Update local state
      setUserBranches((current) => {
        const other = current.filter((ub) => ub.user_id !== branchModalUser.id);
        const newAssignments = selectedBranchIds.map((branchId) => ({
          user_id: branchModalUser.id,
          branch_id: branchId,
        }));
        return [...other, ...newAssignments];
      });

      closeBranchModal();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err instanceof Error ? err.message : "บันทึกข้อมูลไม่สำเร็จ",
      });
    } finally {
      setIsSavingBranches(false);
    }
  }

  return (
    <div className="rounded-[28px] border border-sky-200/80 bg-white/90 p-5 shadow-[0_16px_34px_-24px_rgba(37,99,235,0.35)] backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-semibold text-slate-950">จัดการผู้ใช้งาน</h1>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
        >
          <Plus className="h-4 w-4" />
          เพิ่มผู้ใช้งาน
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-5 overflow-x-auto rounded-2xl border border-sky-100">
        <table className="min-w-full divide-y divide-sky-100 text-sm">
          <thead className="bg-sky-50/80 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">ผู้ใช้งาน</th>
              <th className="px-4 py-3 font-semibold">Username</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">สถานะ</th>
              <th className="px-4 py-3 font-semibold">สาขาที่เข้าถึง</th>
              <th className="px-4 py-3 text-right font-semibold">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-100 bg-white">
            {users.map((row) => {
              const userBranchIds = getUserBranchIds(row.id);
              const userBranchNames = branches
                .filter((b) => userBranchIds.includes(b.id))
                .map((b) => b.name)
                .join(", ");

              return (
                <tr key={row.id} className="align-top text-slate-700">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{row.display_name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{row.username}</td>
                  <td className="px-4 py-3">{row.email || "-"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        row.role === "admin"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-sky-100 text-sky-700"
                      }`}
                    >
                      {row.role === "admin" ? "Admin" : "User"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        row.is_active ? "bg-green-100 text-green-700" : "bg-zinc-200 text-zinc-600"
                      }`}
                    >
                      {row.is_active ? "ใช้งาน" : "ระงับ"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{userBranchNames || "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openBranchModal(row)}
                        className="inline-flex items-center gap-1 rounded-full border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50"
                      >
                        <User className="h-3.5 w-3.5" />
                        สาขา
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(row)}
                        className="inline-flex items-center gap-1 rounded-full border border-sky-200 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        แก้ไข
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(row)}
                        className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* User Form Modal */}
      <AdminModal
        open={open}
        onClose={closeModal}
        title={editingUser ? "แก้ไขข้อมูลผู้ใช้งาน" : "เพิ่มผู้ใช้งาน"}
        description="จัดการข้อมูลผู้ใช้งานและสิทธิ์การเข้าถึง"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Username</span>
              <input
                type="text"
                value={form.username}
                onChange={(event) => updateForm("username", event.target.value)}
                disabled={!!editingUser}
                className="w-full rounded-2xl border border-sky-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400 disabled:bg-slate-100"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">ชื่อแสดง</span>
              <input
                type="text"
                value={form.display_name}
                onChange={(event) => updateForm("display_name", event.target.value)}
                className="w-full rounded-2xl border border-sky-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateForm("email", event.target.value)}
                className="w-full rounded-2xl border border-sky-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                {editingUser ? "รหัสผ่าน (เว้นว่างหากไม่เปลี่ยน)" : "รหัสผ่าน"}
              </span>
              <input
                type="password"
                value={form.password}
                onChange={(event) => updateForm("password", event.target.value)}
                required={!editingUser}
                className="w-full rounded-2xl border border-sky-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Role</span>
              <select
                value={form.role}
                onChange={(event) => updateForm("role", event.target.value as "admin" | "user")}
                className="w-full rounded-2xl border border-sky-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">สถานะ</span>
              <select
                value={form.is_active ? "1" : "0"}
                onChange={(event) => updateForm("is_active", event.target.value === "1")}
                className="w-full rounded-2xl border border-sky-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
              >
                <option value="1">ใช้งาน</option>
                <option value="0">ระงับ</option>
              </select>
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-full border border-sky-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-sky-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
            >
              {isSaving ? "กำลังบันทึก..." : editingUser ? "บันทึกการแก้ไข" : "เพิ่มผู้ใช้งาน"}
            </button>
          </div>
        </form>
      </AdminModal>

      {/* Branch Assignment Modal */}
      <AdminModal
        open={branchModalOpen}
        onClose={closeBranchModal}
        title={branchModalUser ? `มอบหมายสาขา — ${branchModalUser.display_name}` : "มอบหมายสาขา"}
        description="เลือกสาขาที่ผู้ใช้งานสามารถเข้าถึงได้"
      >
        <div className="space-y-3">
          <div className="max-h-64 overflow-y-auto rounded-2xl border border-sky-100 p-3">
            {branches.map((branch) => (
              <label key={branch.id} className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  checked={selectedBranchIds.includes(branch.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedBranchIds((prev) => [...prev, branch.id]);
                    } else {
                      setSelectedBranchIds((prev) => prev.filter((id) => id !== branch.id));
                    }
                  }}
                  className="h-4 w-4 rounded border-sky-300 text-sky-600 focus:ring-sky-500"
                />
                <span className="text-sm text-slate-700">{branch.name}</span>
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeBranchModal}
              disabled={isSavingBranches}
              className="rounded-full border border-sky-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-sky-50 disabled:opacity-60"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSaveBranches}
              disabled={isSavingBranches}
              className="rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
            >
              {isSavingBranches ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}
