"use client";

import { startTransition, useState } from "react";
import { Power, Settings2 } from "lucide-react";
import AdminModal from "@/components/admin-modal";

type BranchStatusRow = {
  id: number;
  name: string;
  is_active: number;
  opening_hours: string | null;
  today_bookings: number;
};

type OpenCloseForm = {
  is_active: string;
  opening_hours: string;
};

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const data = (await response.json()) as T & { error?: string };

  if (!response.ok) throw new Error(data.error ?? "เกิดข้อผิดพลาด");
  return data;
}

export default function AdminOpenCloseGrid({
  initialRows,
}: {
  initialRows: BranchStatusRow[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingRow, setEditingRow] = useState<BranchStatusRow | null>(null);
  const [form, setForm] = useState<OpenCloseForm>({ is_active: "1", opening_hours: "" });
  const [open, setOpen] = useState(false);

  function openEditModal(row: BranchStatusRow) {
    setEditingRow(row);
    setForm({
      is_active: String(row.is_active),
      opening_hours: row.opening_hours ?? "",
    });
    setError("");
    setOpen(true);
  }

  function closeModal() {
    if (isSaving) return;
    setEditingRow(null);
    setOpen(false);
    setError("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingRow) return;

    setError("");
    setIsSaving(true);

    try {
      const result = await requestJson<{
        row: Pick<BranchStatusRow, "id" | "is_active" | "opening_hours">;
      }>(`/api/admin/open-close/${editingRow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_active: Number(form.is_active),
          opening_hours: form.opening_hours,
        }),
      });

      startTransition(() => {
        setRows((current) =>
          current.map((row) =>
            row.id === editingRow.id
              ? {
                  ...row,
                  is_active: result.row.is_active,
                  opening_hours: result.row.opening_hours,
                }
              : row,
          ),
        );
      });

      closeModal();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  }

  async function quickToggle(row: BranchStatusRow) {
    try {
      setError("");
      const result = await requestJson<{
        row: Pick<BranchStatusRow, "id" | "is_active" | "opening_hours">;
      }>(`/api/admin/open-close/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_active: row.is_active === 1 ? 0 : 1,
          opening_hours: row.opening_hours ?? "",
        }),
      });

      startTransition(() => {
        setRows((current) =>
          current.map((item) =>
            item.id === row.id
              ? {
                  ...item,
                  is_active: result.row.is_active,
                  opening_hours: result.row.opening_hours,
                }
              : item,
          ),
        );
      });
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "อัปเดตข้อมูลไม่สำเร็จ");
    }
  }

  return (
    <div className="rounded-[28px] border border-sky-200/80 bg-white/90 p-5 shadow-[0_16px_34px_-24px_rgba(37,99,235,0.35)] backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">
            Open / Close
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">จัดการปิด-เปิด</h1>
        </div>
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
              <th className="px-4 py-3 font-semibold">สาขา</th>
              <th className="px-4 py-3 font-semibold">เวลาเปิด-ปิด</th>
              <th className="px-4 py-3 font-semibold">จองวันนี้</th>
              <th className="px-4 py-3 font-semibold">สถานะ</th>
              <th className="px-4 py-3 text-right font-semibold">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-100 bg-white">
            {rows.map((row) => (
              <tr key={row.id} className="text-slate-700">
                <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                <td className="px-4 py-3">{row.opening_hours ?? "-"}</td>
                <td className="px-4 py-3">{row.today_bookings}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      row.is_active === 1
                        ? "bg-green-100 text-green-700"
                        : "bg-zinc-200 text-zinc-600"
                    }`}
                  >
                    {row.is_active === 1 ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => quickToggle(row)}
                      className="inline-flex items-center gap-1 rounded-full border border-sky-200 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-50"
                    >
                      <Power className="h-3.5 w-3.5" />
                      {row.is_active === 1 ? "ปิดสาขา" : "เปิดสาขา"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(row)}
                      className="inline-flex items-center gap-1 rounded-full border border-sky-200 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-50"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                      ตั้งค่า
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
        title={editingRow ? `ตั้งค่า ${editingRow.name}` : "ตั้งค่าสาขา"}
        description="กำหนดเวลาเปิด-ปิดและสถานะการเปิดใช้งานของสาขา"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">เวลาเปิด-ปิด</span>
            <input
              value={form.opening_hours}
              onChange={(event) =>
                setForm((current) => ({ ...current, opening_hours: event.target.value }))
              }
              className="w-full rounded-2xl border border-sky-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">สถานะ</span>
            <select
              value={form.is_active}
              onChange={(event) =>
                setForm((current) => ({ ...current, is_active: event.target.value }))
              }
              className="w-full rounded-2xl border border-sky-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
            >
              <option value="1">เปิดใช้งาน</option>
              <option value="0">ปิดใช้งาน</option>
            </select>
          </label>

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
              {isSaving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
            </button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
