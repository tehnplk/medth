"use client";

import { useState } from "react";
import Swal from "sweetalert2";
import { Plus, CalendarX, Trash2 } from "lucide-react";

type BranchOption = {
  id: number;
  name: string;
};

type DateOffRow = {
  id: number;
  branch_id: number;
  date_off: string;
  branch_name: string;
};

type Props = {
  initialRows: DateOffRow[];
  branches: BranchOption[];
};

export default function AdminDateOffGrid({ initialRows, branches }: Props) {
  const [rows, setRows] = useState<DateOffRow[]>(initialRows);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(branches[0]?.id ?? null);
  const [newDateOff, setNewDateOff] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState("");

  const filteredRows = selectedBranchId
    ? rows.filter((r) => r.branch_id === selectedBranchId)
    : rows;

  function formatThaiDate(dateStr: string): string {
    const date = new Date(dateStr);
    const dayNames = ["อา", "จ", "อ", "พฤ", "พฤ", "ศ", "ส"];
    const monthNames = [
      "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
      "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ];

    const dayName = dayNames[date.getDay()];
    const day = date.getDate();
    const monthName = monthNames[date.getMonth()];
    const year = date.getFullYear() + 543;

    return `${dayName}-${day} ${monthName}${year}`;
  }

  async function handleAdd() {
    setError("");
    if (!selectedBranchId || !newDateOff) {
      setError("กรุณาเลือกสาขาและวันที่");
      return;
    }

    try {
      const res = await fetch("/api/admin/date-off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch_id: selectedBranchId,
          date_off: newDateOff,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "เพิ่มวันหยุดไม่สำเร็จ");
        return;
      }

      const branchName = branches.find((b) => b.id === selectedBranchId)?.name || "";
      const newId = Date.now(); // Use timestamp as temporary ID
      setRows([
        ...rows,
        {
          id: data.insertId || newId,
          branch_id: selectedBranchId,
          date_off: newDateOff,
          branch_name: branchName,
        },
      ]);
      setNewDateOff("");
      setIsModalOpen(false);
    } catch (err) {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    }
  }

  async function handleDelete(row: DateOffRow) {
    const result = await Swal.fire({
      title: "ยืนยันการลบ?",
      text: `คุณต้องการลบวันหยุด ${formatThaiDate(row.date_off)} ของ ${row.branch_name}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#3b82f6",
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/admin/date-off/${row.id}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          setError("ลบวันหยุดไม่สำเร็จ");
          return;
        }

        setRows(rows.filter((r) => r.id !== row.id));
        await Swal.fire({
          title: "ลบสำเร็จ",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (err) {
        setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
      }
    }
  }

  return (
    <div className="rounded-[28px] border border-sky-200/80 bg-white/90 p-5 shadow-[0_16px_34px_-24px_rgba(37,99,235,0.35)] backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-semibold text-slate-950">จัดการวันหยุด</h1>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
        >
          <Plus className="h-4 w-4" />
          เพิ่มวันหยุด
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {branches.map((branch) => (
          <button
            key={branch.id}
            type="button"
            onClick={() => setSelectedBranchId(branch.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              selectedBranchId === branch.id
                ? "bg-sky-600 text-white"
                : "border border-sky-200 text-slate-700 hover:bg-sky-50"
            }`}
          >
            {branch.name}
          </button>
        ))}
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-sky-100">
        <table className="min-w-full divide-y divide-sky-100 text-sm">
          <thead className="bg-sky-50/80 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">สาขา</th>
              <th className="px-4 py-3 font-semibold">วันหยุด</th>
              <th className="px-4 py-3 text-right font-semibold">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-100 bg-white">
            {filteredRows.map((row) => (
              <tr key={row.id} className="align-top text-slate-700">
                <td className="px-4 py-3">{row.branch_name}</td>
                <td className="px-4 py-3">{formatThaiDate(row.date_off)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleDelete(row)}
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-sky-200 bg-white p-6 shadow-xl">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900">เพิ่มวันหยุด</h3>
              <p className="text-sm text-slate-600">เพิ่มวันหยุดสำหรับแต่ละสาขา</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">สาขา</label>
                <select
                  value={selectedBranchId || ""}
                  onChange={(e) => setSelectedBranchId(parseInt(e.target.value) || null)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-sky-300 transition focus:ring-2"
                  required
                >
                  <option value="">เลือกสาขา</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">วันที่</label>
                <input
                  type="date"
                  value={newDateOff}
                  onChange={(e) => setNewDateOff(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-sky-300 transition focus:ring-2"
                  required
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setError("");
                  setNewDateOff("");
                }}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleAdd}
                className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
