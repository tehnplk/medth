"use client";

import { startTransition, useState } from "react";
import Image from "next/image";
import { ImageOff, Pencil, Plus, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import AdminModal from "@/components/admin-modal";
import ImageUploader from "@/components/image-uploader";

type BranchRow = {
  id: number;
  name: string;
  location_detail: string | null;
  opening_hours: string | null;
  coordinates: string | null;
  cover_image: string | null;
  is_active: number;
};

type BranchForm = {
  name: string;
  location_detail: string;
  opening_hours: string;
  coordinates: string;
  cover_image: string;
  is_active: string;
};

type DeleteSummary = {
  futureBookingCount: number;
};

const emptyForm: BranchForm = {
  name: "",
  location_detail: "",
  opening_hours: "",
  coordinates: "",
  cover_image: "",
  is_active: "1",
};

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const data = (await response.json()) as T & { error?: string };

  if (!response.ok) throw new Error(data.error ?? "เกิดข้อผิดพลาด");
  return data;
}

function toForm(row: BranchRow): BranchForm {
  return {
    name: row.name,
    location_detail: row.location_detail ?? "",
    opening_hours: row.opening_hours ?? "",
    coordinates: row.coordinates ?? "",
    cover_image: row.cover_image ?? "",
    is_active: String(row.is_active),
  };
}

export default function AdminBranchesGrid({ initialRows, userRole }: { initialRows: BranchRow[]; userRole: string }) {
  const [rows, setRows] = useState(initialRows);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingRow, setEditingRow] = useState<BranchRow | null>(null);
  const [form, setForm] = useState<BranchForm>(emptyForm);
  const [open, setOpen] = useState(false);

  function openCreateModal() {
    setEditingRow(null);
    setForm(emptyForm);
    setError("");
    setOpen(true);
  }

  function openEditModal(row: BranchRow) {
    setEditingRow(row);
    setForm(toForm(row));
    setError("");
    setOpen(true);
  }

  function closeModal() {
    if (isSaving) return;
    setOpen(false);
    setEditingRow(null);
    setForm(emptyForm);
    setError("");
  }

  function updateForm<Key extends keyof BranchForm>(key: Key, value: BranchForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      const payload = { ...form, is_active: Number(form.is_active) };

      if (editingRow) {
        const result = await requestJson<{ row: BranchRow }>(
          `/api/admin/branches/${editingRow.id}`,
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
        const result = await requestJson<{ row: BranchRow }>("/api/admin/branches", {
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

  async function handleDelete(row: BranchRow) {
    let summary: DeleteSummary | null = null;

    try {
      summary = await requestJson<DeleteSummary>(`/api/admin/branches/${row.id}/delete-summary`);
    } catch {
      summary = null;
    }

    const deleteText =
      summary === null
        ? `ลบสาขา "${row.name}" ใช่หรือไม่`
        : summary.futureBookingCount > 0
          ? `ลบสาขา "${row.name}" ใช่หรือไม่\nสาขานี้มีการจองค้างอยู่ ${summary.futureBookingCount} การจอง`
          : `ลบสาขา "${row.name}" ใช่หรือไม่\nตั้งแต่วันนี้เป็นต้นไป ไม่มีการจองสาขานี้`;

    const result = await Swal.fire({
      title: "ยืนยันการลบ",
      text: deleteText,
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
      await requestJson<{ success: true }>(`/api/admin/branches/${row.id}`, {
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
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">
            Branches
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">จัดการสาขา</h1>
        </div>
        {userRole === "admin" && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
          >
            <Plus className="h-4 w-4" />
            เพิ่มสาขา
          </button>
        )}
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
              <th className="px-4 py-3 font-semibold">รูปปก</th>
              <th className="px-4 py-3 font-semibold">ชื่อสาขา</th>
              <th className="px-4 py-3 font-semibold">โซนที่ตั้ง</th>
              <th className="px-4 py-3 font-semibold">เวลาเปิด-ปิด</th>
              <th className="px-4 py-3 font-semibold">พิกัด</th>
              <th className="px-4 py-3 font-semibold">สถานะ</th>
              <th className="px-4 py-3 text-right font-semibold">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-100 bg-white">
            {rows.map((row) => (
              <tr key={row.id} className="align-top text-slate-700">
                <td className="px-4 py-3">
                  <div className="relative h-12 w-20 overflow-hidden rounded-lg border border-sky-100 bg-slate-50 flex items-center justify-center text-slate-400">
                    {row.cover_image ? (
                      <Image
                        src={row.cover_image}
                        alt={row.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <ImageOff className="h-5 w-5" />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                <td className="px-4 py-3">{row.location_detail ?? "-"}</td>
                <td className="px-4 py-3">{row.opening_hours ?? "-"}</td>
                <td className="px-4 py-3">{row.coordinates ?? "-"}</td>
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
                      onClick={() => openEditModal(row)}
                      className="inline-flex items-center gap-1 rounded-full border border-sky-200 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-50"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      แก้ไข
                    </button>
                    {userRole === "admin" && (
                      <button
                        type="button"
                        onClick={() => handleDelete(row)}
                        className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        ลบ
                      </button>
                    )}
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
        title={editingRow ? "แก้ไขข้อมูลสาขา" : "เพิ่มสาขา"}
        description="บันทึกรายละเอียดสาขาเพื่อใช้ในหน้าจองและหน้าจัดการ"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">ชื่อสาขา</span>
              <input
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
                className="w-full rounded-2xl border border-sky-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">สถานะ</span>
              <select
                value={form.is_active}
                onChange={(event) => updateForm("is_active", event.target.value)}
                className="w-full rounded-2xl border border-sky-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
              >
                <option value="1">เปิดใช้งาน</option>
                <option value="0">ปิดใช้งาน</option>
              </select>
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">โซนที่ตั้ง</span>
              <input
                value={form.location_detail}
                onChange={(event) => updateForm("location_detail", event.target.value)}
                className="w-full rounded-2xl border border-sky-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">เวลาเปิด-ปิด</span>
              <input
                value={form.opening_hours}
                onChange={(event) => updateForm("opening_hours", event.target.value)}
                className="w-full rounded-2xl border border-sky-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">พิกัด</span>
              <input
                value={form.coordinates}
                onChange={(event) => updateForm("coordinates", event.target.value)}
                className="w-full rounded-2xl border border-sky-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
              />
            </label>
            <div className="block md:col-span-2">
              <ImageUploader
                value={form.cover_image}
                onChange={(path) => updateForm("cover_image", path)}
                kind="branch"
                label="รูปปกสาขา"
                previewClassName="h-24 w-40"
              />
            </div>
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
              {isSaving ? "กำลังบันทึก..." : editingRow ? "บันทึกการแก้ไข" : "เพิ่มสาขา"}
            </button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
