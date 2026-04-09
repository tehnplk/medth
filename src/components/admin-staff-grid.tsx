"use client";

import { startTransition, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import AdminModal from "@/components/admin-modal";

type StaffRow = {
  id: number;
  branch_id: number;
  full_name: string;
  staff_code: string;
  phone: string | null;
  photo_path: string | null;
  skill_note: string | null;
  status: "active" | "inactive";
  branch_name: string;
};

type BranchOption = {
  id: number;
  name: string;
};

type StaffForm = {
  branch_id: string;
  staff_code: string;
  full_name: string;
  phone: string;
  photo_path: string;
  skill_note: string;
  status: "active" | "inactive";
};

const emptyForm: StaffForm = {
  branch_id: "",
  staff_code: "",
  full_name: "",
  phone: "",
  photo_path: "",
  skill_note: "",
  status: "active",
};

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const data = (await response.json()) as T & { error?: string };

  if (!response.ok) throw new Error(data.error ?? "เกิดข้อผิดพลาด");
  return data;
}

function toForm(row: StaffRow): StaffForm {
  return {
    branch_id: String(row.branch_id),
    staff_code: row.staff_code,
    full_name: row.full_name,
    phone: row.phone ?? "",
    photo_path: row.photo_path ?? "",
    skill_note: row.skill_note ?? "",
    status: row.status,
  };
}

export default function AdminStaffGrid({
  initialRows,
  branches,
}: {
  initialRows: StaffRow[];
  branches: BranchOption[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingRow, setEditingRow] = useState<StaffRow | null>(null);
  const [form, setForm] = useState<StaffForm>({
    ...emptyForm,
    branch_id: branches[0] ? String(branches[0].id) : "",
  });
  const [open, setOpen] = useState(false);

  function openCreateModal() {
    setEditingRow(null);
    setForm({
      ...emptyForm,
      branch_id: branches[0] ? String(branches[0].id) : "",
    });
    setError("");
    setOpen(true);
  }

  function openEditModal(row: StaffRow) {
    setEditingRow(row);
    setForm(toForm(row));
    setError("");
    setOpen(true);
  }

  function closeModal() {
    if (isSaving) return;
    setOpen(false);
    setEditingRow(null);
    setError("");
  }

  function updateForm<Key extends keyof StaffForm>(key: Key, value: StaffForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    try {
      const payload = { ...form, branch_id: Number(form.branch_id) };

      if (editingRow) {
        const result = await requestJson<{ row: StaffRow }>(`/api/admin/staff/${editingRow.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        startTransition(() => {
          setRows((current) =>
            current.map((row) => (row.id === result.row.id ? result.row : row)),
          );
        });
      } else {
        const result = await requestJson<{ row: StaffRow }>("/api/admin/staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        startTransition(() => {
          setRows((current) => [...current, result.row]);
        });
      }

      closeModal();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(row: StaffRow) {
    if (!window.confirm(`ลบพนักงาน "${row.full_name}" ใช่หรือไม่`)) return;

    try {
      setError("");
      await requestJson<{ success: true }>(`/api/admin/staff/${row.id}`, { method: "DELETE" });
      startTransition(() => {
        setRows((current) => current.filter((item) => item.id !== row.id));
      });
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "ลบข้อมูลไม่สำเร็จ");
    }
  }

  return (
    <div className="rounded-[28px] border border-sky-200/80 bg-white/90 p-5 shadow-[0_16px_34px_-24px_rgba(37,99,235,0.35)] backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">Staff</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">จัดการพนักงาน</h1>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
        >
          <Plus className="h-4 w-4" />
          เพิ่มพนักงาน
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
              <th className="px-4 py-3 font-semibold">พนักงาน</th>
              <th className="px-4 py-3 font-semibold">สาขา</th>
              <th className="px-4 py-3 font-semibold">เบอร์โทร</th>
              <th className="px-4 py-3 font-semibold">ทักษะ</th>
              <th className="px-4 py-3 font-semibold">สถานะ</th>
              <th className="px-4 py-3 text-right font-semibold">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-100 bg-white">
            {rows.map((row) => (
              <tr key={row.id} className="align-top text-slate-700">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{row.full_name}</p>
                  <p className="mt-1 text-xs text-slate-500">รหัส {row.staff_code}</p>
                </td>
                <td className="px-4 py-3">{row.branch_name}</td>
                <td className="px-4 py-3">{row.phone ?? "-"}</td>
                <td className="px-4 py-3">{row.skill_note ?? "-"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      row.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-zinc-200 text-zinc-600"
                    }`}
                  >
                    {row.status === "active" ? "พร้อมทำงาน" : "ไม่พร้อม"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
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
            ))}
          </tbody>
        </table>
      </div>

      <AdminModal
        open={open}
        onClose={closeModal}
        title={editingRow ? "แก้ไขข้อมูลพนักงาน" : "เพิ่มพนักงาน"}
        description="จัดการข้อมูลพนักงานที่ใช้ในขั้นตอนเลือกผู้ให้บริการ"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">สาขา</span>
              <select
                value={form.branch_id}
                onChange={(event) => updateForm("branch_id", event.target.value)}
                className="w-full rounded-2xl border border-sky-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
              >
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">สถานะ</span>
              <select
                value={form.status}
                onChange={(event) =>
                  updateForm("status", event.target.value as StaffForm["status"])
                }
                className="w-full rounded-2xl border border-sky-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
              >
                <option value="active">พร้อมทำงาน</option>
                <option value="inactive">ไม่พร้อม</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">รหัสพนักงาน</span>
              <input
                value={form.staff_code}
                onChange={(event) => updateForm("staff_code", event.target.value)}
                className="w-full rounded-2xl border border-sky-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">ชื่อพนักงาน</span>
              <input
                value={form.full_name}
                onChange={(event) => updateForm("full_name", event.target.value)}
                className="w-full rounded-2xl border border-sky-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">เบอร์โทร</span>
              <input
                value={form.phone}
                onChange={(event) => updateForm("phone", event.target.value)}
                className="w-full rounded-2xl border border-sky-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Photo path</span>
              <input
                value={form.photo_path}
                onChange={(event) => updateForm("photo_path", event.target.value)}
                className="w-full rounded-2xl border border-sky-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">ทักษะ</span>
              <input
                value={form.skill_note}
                onChange={(event) => updateForm("skill_note", event.target.value)}
                className="w-full rounded-2xl border border-sky-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
              />
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
              {isSaving ? "กำลังบันทึก..." : editingRow ? "บันทึกการแก้ไข" : "เพิ่มพนักงาน"}
            </button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
