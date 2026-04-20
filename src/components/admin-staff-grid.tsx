"use client";

import { startTransition, useState } from "react";
import Image from "next/image";
import { CalendarOff, ChevronLeft, ChevronRight, Pencil, Plus, Trash2, User } from "lucide-react";
import Swal from "sweetalert2";
import AdminModal from "@/components/admin-modal";
import ImageUploader from "@/components/image-uploader";

type StaffRow = {
  id: number;
  branch_id: number;
  full_name: string;
  staff_code: string;
  phone: string | null;
  gender: "male" | "female" | "other";
  photo_path: string | null;
  skill_note: string | null;
  status: "active" | "inactive";
  branch_name: string;
};

const genderLabels: Record<StaffRow["gender"], string> = {
  male: "ชาย",
  female: "หญิง",
  other: "ไม่ระบุ",
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
  gender: "male" | "female" | "other";
  photo_path: string;
  skill_note: string;
  status: "active" | "inactive";
};

type LeaveRow = {
  id: number;
  staff_id: number;
  branch_id: number;
  leave_date: string;
  leave_type: "sick" | "personal" | "vacation";
  reason: string | null;
};

type LeaveForm = {
  leave_type: "sick" | "personal" | "vacation";
  reason: string;
};

type DeleteSummary = {
  futureBookingCount: number;
};

const leaveTypeLabels: Record<LeaveRow["leave_type"], string> = {
  sick: "ลาป่วย",
  personal: "ลากิจ",
  vacation: "ลาพักร้อน",
};

const thaiMonths = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

const thaiMonthsFull = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

const weekDays = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatThaiDate(raw: string) {
  const datePart = raw.slice(0, 10);
  const [y, m, d] = datePart.split("-");
  return `${Number(d)} ${thaiMonths[Number(m) - 1]} ${Number(y) + 543}`;
}

const emptyLeaveForm: LeaveForm = {
  leave_type: "personal",
  reason: "",
};

const emptyForm: StaffForm = {
  branch_id: "",
  staff_code: "",
  full_name: "",
  phone: "",
  gender: "other",
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
    gender: row.gender,
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
  const [isSaving, setIsSaving] = useState(false);
  const [editingRow, setEditingRow] = useState<StaffRow | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<number>(
    branches[0]?.id ?? 0,
  );
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [filterSearch, setFilterSearch] = useState("");
  const [form, setForm] = useState<StaffForm>({
    ...emptyForm,
    branch_id: branches[0] ? String(branches[0].id) : "",
  });
  const [open, setOpen] = useState(false);

  const filteredRows = rows.filter((r) => {
    if (selectedBranchId && r.branch_id !== selectedBranchId) return false;
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      return (
        r.full_name.toLowerCase().includes(q) ||
        r.staff_code.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // --- Leave modal state ---
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveStaff, setLeaveStaff] = useState<StaffRow | null>(null);
  const [leaves, setLeaves] = useState<LeaveRow[]>([]);
  const [leaveForm, setLeaveForm] = useState<LeaveForm>({ ...emptyLeaveForm });
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveSaving, setLeaveSaving] = useState(false);
  const [leaveError, setLeaveError] = useState("");

  async function openLeaveModal(row: StaffRow) {
    setLeaveStaff(row);
    setLeaveForm({ ...emptyLeaveForm });
    setSelectedDates([]);
    setLeaveError("");
    setLeaveOpen(true);
    setLeaveLoading(true);
    const now = new Date();
    setCalMonth({ year: now.getFullYear(), month: now.getMonth() });
    try {
      const res = await requestJson<{ rows: LeaveRow[] }>(`/api/admin/staff/${row.id}/leaves`);
      setLeaves(res.rows);
    } catch {
      setLeaveError("โหลดข้อมูลการลาไม่สำเร็จ");
      setLeaves([]);
    } finally {
      setLeaveLoading(false);
    }
  }

  function closeLeaveModal() {
    if (leaveSaving) return;
    setLeaveOpen(false);
    setLeaveStaff(null);
    setLeaves([]);
    setSelectedDates([]);
    setLeaveError("");
  }

  function toggleDate(key: string) {
    setSelectedDates((cur) =>
      cur.includes(key) ? cur.filter((d) => d !== key) : [...cur, key],
    );
  }

  async function handleLeaveSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!leaveStaff || selectedDates.length === 0) {
      setLeaveError("กรุณาเลือกอย่างน้อย 1 วัน");
      return;
    }
    setLeaveError("");
    setLeaveSaving(true);
    try {
      const newLeaves: LeaveRow[] = [];
      for (const date of selectedDates) {
        const res = await requestJson<{ row: LeaveRow }>(
          `/api/admin/staff/${leaveStaff.id}/leaves`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              leave_date: date,
              leave_type: leaveForm.leave_type,
              reason: leaveForm.reason,
              branch_id: leaveStaff.branch_id,
            }),
          },
        );
        newLeaves.push(res.row);
      }
      setLeaves((cur) => [...newLeaves, ...cur]);
      setSelectedDates([]);
      setLeaveForm({ ...emptyLeaveForm });
    } catch (err) {
      setLeaveError(err instanceof Error ? err.message : "บันทึกการลาไม่สำเร็จ");
    } finally {
      setLeaveSaving(false);
    }
  }

  async function handleLeaveDelete(leave: LeaveRow) {
    const result = await Swal.fire({
      title: "ยืนยันการลบ",
      text: `ลบรายการลาวันที่ ${formatThaiDate(leave.leave_date)} ใช่หรือไม่`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
    });
    if (!result.isConfirmed) return;
    try {
      await requestJson<{ success: true }>(`/api/admin/staff-leaves/${leave.id}`, {
        method: "DELETE",
      });
      setLeaves((cur) => cur.filter((l) => l.id !== leave.id));
    } catch {
      setLeaveError("ลบรายการลาไม่สำเร็จ");
    }
  }

  function openCreateModal() {
    setEditingRow(null);
    setForm({
      ...emptyForm,
      branch_id: selectedBranchId ? String(selectedBranchId) : (branches[0] ? String(branches[0].id) : ""),
    });
    setOpen(true);
  }

  function openEditModal(row: StaffRow) {
    setEditingRow(row);
    setForm(toForm(row));
    setOpen(true);
  }

  function closeModal() {
    if (isSaving) return;
    setOpen(false);
    setEditingRow(null);
  }

  function updateForm<Key extends keyof StaffForm>(key: Key, value: StaffForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      Swal.fire({
        title: "เกิดข้อผิดพลาด",
        text: submitError instanceof Error ? submitError.message : "บันทึกข้อมูลไม่สำเร็จ",
        icon: "error",
        confirmButtonText: "ตกลง",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(row: StaffRow) {
    let summary: DeleteSummary | null = null;

    try {
      summary = await requestJson<DeleteSummary>(`/api/admin/staff/${row.id}/delete-summary`);
    } catch {
      summary = null;
    }

    const deleteText =
      summary === null
        ? `ลบพนักงาน "${row.full_name}" ใช่หรือไม่`
        : summary.futureBookingCount > 0
          ? `ลบพนักงาน "${row.full_name}" ใช่หรือไม่\nพนักงานท่านนี้มีการจองค้างอยู่ ${summary.futureBookingCount} การจอง`
          : `ลบพนักงาน "${row.full_name}" ใช่หรือไม่\nตั้งแต่วันนี้เป็นต้นไป ไม่มีการจองพนักงานคนนี้`;

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
      await requestJson<{ success: true }>(`/api/admin/staff/${row.id}`, { method: "DELETE" });
      startTransition(() => {
        setRows((current) => current.filter((item) => item.id !== row.id));
      });
    } catch (deleteError) {
      Swal.fire({
        title: "เกิดข้อผิดพลาด",
        text: deleteError instanceof Error ? deleteError.message : "ลบข้อมูลไม่สำเร็จ",
        icon: "error",
        confirmButtonText: "ตกลง",
      });
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

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          placeholder="ค้นหาชื่อ / รหัสพนักงาน"
          className="rounded-full border border-sky-200 px-3 py-1.5 text-sm outline-none focus:border-sky-400 min-w-[200px]"
        />
        <div className="flex gap-1.5">
          {(["all", "active", "inactive"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilterStatus(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                filterStatus === s
                  ? "bg-sky-600 text-white"
                  : "border border-sky-200 text-sky-700 hover:bg-sky-50"
              }`}
            >
              {s === "all" ? "ทั้งหมด" : s === "active" ? "พร้อมทำงาน" : "ไม่พร้อม"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-sky-100">
        <table className="min-w-full divide-y divide-sky-100 text-sm">
          <thead className="bg-sky-50/80 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">รูป</th>
              <th className="px-4 py-3 font-semibold">พนักงาน</th>
              <th className="px-4 py-3 font-semibold">สาขา</th>
              <th className="px-4 py-3 font-semibold">เพศ</th>
              <th className="px-4 py-3 font-semibold">เบอร์โทร</th>
              <th className="px-4 py-3 font-semibold">ทักษะ</th>
              <th className="px-4 py-3 font-semibold">สถานะ</th>
              <th className="px-4 py-3 text-right font-semibold">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-100 bg-white">
            {filteredRows.map((row) => (
              <tr key={row.id} className="align-top text-slate-700">
                <td className="px-4 py-3">
                  <div className="relative h-12 w-12 overflow-hidden rounded-full border border-sky-100 bg-slate-50 flex items-center justify-center text-slate-400">
                    {row.photo_path ? (
                      <Image
                        src={row.photo_path}
                        alt={row.full_name}
                        fill
                        sizes="48px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <User className="h-5 w-5" />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-block rounded-md border border-sky-100 bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-700 shadow-sm">
                    {row.staff_code}
                  </span>
                  <p className="mt-1 font-medium text-slate-900">{row.full_name}</p>
                </td>
                <td className="px-4 py-3">{row.branch_name}</td>
                <td className="px-4 py-3">{genderLabels[row.gender]}</td>
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
                      onClick={() => openLeaveModal(row)}
                      className="inline-flex items-center gap-1 rounded-full border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-50"
                    >
                      <CalendarOff className="h-3.5 w-3.5" />
                      การลา
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
              <span className="mb-1.5 block text-sm font-medium text-slate-700">เพศ</span>
              <select
                value={form.gender}
                onChange={(event) =>
                  updateForm("gender", event.target.value as StaffForm["gender"])
                }
                className="w-full rounded-2xl border border-sky-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
              >
                <option value="male">ชาย</option>
                <option value="female">หญิง</option>
                <option value="other">ไม่ระบุ</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">เบอร์โทร</span>
              <input
                value={form.phone}
                onChange={(event) => updateForm("phone", event.target.value)}
                className="w-full rounded-2xl border border-sky-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
              />
            </label>
            <div className="block">
              <ImageUploader
                value={form.photo_path}
                onChange={(path) => updateForm("photo_path", path)}
                kind="staff"
                label="รูปพนักงาน"
              />
            </div>
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

      {/* Leave modal */}
      <AdminModal
        open={leaveOpen}
        onClose={closeLeaveModal}
        title={leaveStaff ? `การลา — ${leaveStaff.full_name}` : "การลา"}
        description={leaveStaff ? `สาขา: ${leaveStaff.branch_name}` : "จัดการวันลาของพนักงาน"}
      >
        {leaveError ? (
          <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {leaveError}
          </p>
        ) : null}

        <form onSubmit={handleLeaveSubmit} className="mb-5 space-y-4">
          {/* Calendar */}
          <div className="rounded-2xl border border-sky-100 p-3">
            {/* Month navigation */}
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setCalMonth(({ year, month }) => {
                    const d = new Date(year, month - 1, 1);
                    return { year: d.getFullYear(), month: d.getMonth() };
                  })
                }
                className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-sky-100"
              >
                <ChevronLeft className="h-4 w-4 text-sky-700" />
              </button>
              <span className="text-sm font-semibold text-slate-800">
                {thaiMonthsFull[calMonth.month]} {calMonth.year + 543}
              </span>
              <button
                type="button"
                onClick={() =>
                  setCalMonth(({ year, month }) => {
                    const d = new Date(year, month + 1, 1);
                    return { year: d.getFullYear(), month: d.getMonth() };
                  })
                }
                className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-sky-100"
              >
                <ChevronRight className="h-4 w-4 text-sky-700" />
              </button>
            </div>
            {/* Weekday headers */}
            <div className="mb-1 grid grid-cols-7 text-center text-xs font-semibold text-slate-500">
              {weekDays.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            {/* Days grid */}
            {(() => {
              const { year, month } = calMonth;
              const firstDay = new Date(year, month, 1).getDay();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const existingDates = new Set(leaves.map((l) => l.leave_date.slice(0, 10)));
              const cells: React.ReactNode[] = [];
              for (let i = 0; i < firstDay; i++) {
                cells.push(<div key={`e-${i}`} />);
              }
              for (let day = 1; day <= daysInMonth; day++) {
                const key = toDateKey(year, month, day);
                const isSelected = selectedDates.includes(key);
                const isExisting = existingDates.has(key);
                cells.push(
                  <button
                    key={key}
                    type="button"
                    onClick={() => !isExisting && toggleDate(key)}
                    disabled={isExisting}
                    className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm transition
                      ${isExisting ? "cursor-not-allowed bg-red-100 text-red-400" : ""}
                      ${isSelected && !isExisting ? "bg-sky-600 font-semibold text-white" : ""}
                      ${!isSelected && !isExisting ? "hover:bg-sky-100 text-slate-700" : ""}
                    `}
                  >
                    {day}
                  </button>,
                );
              }
              return <div className="grid grid-cols-7 gap-y-1">{cells}</div>;
            })()}
          </div>

          {/* Selected dates summary */}
          {selectedDates.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedDates.sort().map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700"
                >
                  {formatThaiDate(d)}
                  <button
                    type="button"
                    onClick={() => toggleDate(d)}
                    className="ml-0.5 text-sky-500 hover:text-sky-700"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Type + reason + submit */}
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">ประเภท</span>
              <select
                value={leaveForm.leave_type}
                onChange={(e) =>
                  setLeaveForm((f) => ({
                    ...f,
                    leave_type: e.target.value as LeaveForm["leave_type"],
                  }))
                }
                className="w-full rounded-2xl border border-sky-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
              >
                <option value="sick">ลาป่วย</option>
                <option value="personal">ลากิจ</option>
                <option value="vacation">ลาพักร้อน</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">เหตุผล</span>
              <input
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="ไม่ระบุก็ได้"
                className="w-full rounded-2xl border border-sky-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
              />
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={leaveSaving || selectedDates.length === 0}
              className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {leaveSaving
                ? "กำลังบันทึก..."
                : `เพิ่มวันลา${selectedDates.length > 0 ? ` (${selectedDates.length} วัน)` : ""}`}
            </button>
          </div>
        </form>

        {leaveLoading ? (
          <p className="py-6 text-center text-sm text-slate-500">กำลังโหลด...</p>
        ) : leaves.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">ไม่มีรายการลา</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-sky-100">
            <table className="min-w-full divide-y divide-sky-100 text-sm">
              <thead className="bg-sky-50/80 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">วันที่</th>
                  <th className="px-4 py-3 font-semibold">ประเภท</th>
                  <th className="px-4 py-3 font-semibold">เหตุผล</th>
                  <th className="px-4 py-3 text-right font-semibold">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-100 bg-white">
                {leaves.map((leave) => (
                  <tr key={leave.id} className="text-slate-700">
                    <td className="px-4 py-3">{formatThaiDate(leave.leave_date)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">
                        {leaveTypeLabels[leave.leave_type]}
                      </span>
                    </td>
                    <td className="px-4 py-3">{leave.reason ?? "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleLeaveDelete(leave)}
                        className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        ลบ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminModal>
    </div>
  );
}
