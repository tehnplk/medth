"use client";

import { startTransition, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import AdminModal from "@/components/admin-modal";

type TimeSlotRow = {
  id: number;
  branch_id: number;
  begin_time: string;
  end_time: string;
  duration_minutes: number;
  branch_name: string;
};

type BranchOption = {
  id: number;
  name: string;
};

type TimeSlotForm = {
  branch_id: string;
  begin_time: string;
  end_time: string;
  duration_minutes: string;
};

const emptyForm: TimeSlotForm = {
  branch_id: "",
  begin_time: "08:30",
  end_time: "10:00",
  duration_minutes: "90",
};

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const data = (await response.json()) as T & { error?: string };

  if (!response.ok) throw new Error(data.error ?? "เกิดข้อผิดพลาด");
  return data;
}

function formatTime(raw: string) {
  const [hour = "00", minute = "00"] = raw.split(":");
  return `${hour}.${minute}`;
}

function toInputTime(raw: string) {
  return raw.slice(0, 5);
}

function toForm(row: TimeSlotRow): TimeSlotForm {
  return {
    branch_id: String(row.branch_id),
    begin_time: toInputTime(row.begin_time),
    end_time: toInputTime(row.end_time),
    duration_minutes: String(row.duration_minutes),
  };
}

export default function AdminTimeSlotsGrid({
  initialRows,
  branches,
}: {
  initialRows: TimeSlotRow[];
  branches: BranchOption[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingRow, setEditingRow] = useState<TimeSlotRow | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<number>(
    branches[0]?.id ?? 0,
  );
  const [form, setForm] = useState<TimeSlotForm>({
    ...emptyForm,
    branch_id: branches[0] ? String(branches[0].id) : "",
  });
  const [open, setOpen] = useState(false);

  const filteredRows = selectedBranchId
    ? rows.filter((r) => r.branch_id === selectedBranchId)
    : rows;

  function openCreateModal() {
    setEditingRow(null);
    setForm({
      ...emptyForm,
      branch_id: selectedBranchId ? String(selectedBranchId) : (branches[0] ? String(branches[0].id) : ""),
    });
    setError("");
    setOpen(true);
  }

  function openEditModal(row: TimeSlotRow) {
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

  function updateForm<Key extends keyof TimeSlotForm>(key: Key, value: TimeSlotForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    try {
      const payload = {
        ...form,
        branch_id: Number(form.branch_id),
        duration_minutes: Number(form.duration_minutes),
      };

      if (editingRow) {
        const result = await requestJson<{ row: TimeSlotRow }>(
          `/api/admin/time-slots/${editingRow.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );

        startTransition(() => {
          setRows((current) =>
            current.map((row) => (row.id === result.row.id ? result.row : row)),
          );
        });
      } else {
        const result = await requestJson<{ row: TimeSlotRow }>("/api/admin/time-slots", {
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

  async function handleDelete(row: TimeSlotRow) {
    const result = await Swal.fire({
      title: "ยืนยันการลบ",
      text: `ลบช่วงเวลา ${formatTime(row.begin_time)} - ${formatTime(row.end_time)} ใช่หรือไม่`,
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
      await requestJson<{ success: true }>(`/api/admin/time-slots/${row.id}`, {
        method: "DELETE",
      });
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
          <h1 className="text-[19px] font-semibold text-slate-950">จัดการเวลาจอง</h1>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
        >
          <Plus className="h-4 w-4" />
          เพิ่มช่วงเวลา
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {branches.map((branch) => (
          <button
            key={branch.id}
            type="button"
            onClick={() => setSelectedBranchId(branch.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              selectedBranchId === branch.id
                ? "bg-sky-600 text-white"
                : "border border-sky-200 text-sky-700 hover:bg-sky-50"
            }`}
          >
            {branch.name}
          </button>
        ))}
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
              <th className="px-4 py-3 font-semibold">เวลาเริ่ม</th>
              <th className="px-4 py-3 font-semibold">เวลาสิ้นสุด</th>
              <th className="px-4 py-3 font-semibold">นาที</th>
              <th className="px-4 py-3 text-right font-semibold">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-100 bg-white">
            {filteredRows.map((row) => (
              <tr key={row.id} className="text-slate-700">
                <td className="px-4 py-3 font-medium text-slate-900">{row.branch_name}</td>
                <td className="px-4 py-3">{formatTime(row.begin_time)}</td>
                <td className="px-4 py-3">{formatTime(row.end_time)}</td>
                <td className="px-4 py-3">{row.duration_minutes}</td>
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
        title={editingRow ? "แก้ไขช่วงเวลา" : "เพิ่มช่วงเวลา"}
        description="จัดการช่วงเวลาที่ใช้ให้ผู้จองเลือกในแต่ละสาขา"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block md:col-span-2">
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
              <span className="mb-1.5 block text-sm font-medium text-slate-700">เวลาเริ่ม</span>
              <input
                type="time"
                value={form.begin_time}
                onChange={(event) => updateForm("begin_time", event.target.value)}
                className="w-full rounded-2xl border border-sky-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">เวลาสิ้นสุด</span>
              <input
                type="time"
                value={form.end_time}
                onChange={(event) => updateForm("end_time", event.target.value)}
                className="w-full rounded-2xl border border-sky-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">จำนวนนาที</span>
              <input
                type="number"
                min={1}
                value={form.duration_minutes}
                onChange={(event) => updateForm("duration_minutes", event.target.value)}
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
              {isSaving ? "กำลังบันทึก..." : editingRow ? "บันทึกการแก้ไข" : "เพิ่มช่วงเวลา"}
            </button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
