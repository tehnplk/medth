import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type Props = {
  title: string;
  backHref?: string;
};

export default function BookingTopBar({ title, backHref }: Props) {
  return (
    <header className="flex flex-shrink-0 items-center justify-between bg-white px-4 py-3">
      {backHref ? (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm font-medium text-sky-700"
        >
          <ChevronLeft className="h-4 w-4" />
          ย้อนกลับ
        </Link>
      ) : (
        <div className="w-16" />
      )}
      <span className="text-sm font-semibold text-sky-900">{title}</span>
      <div className="w-16" />
    </header>
  );
}
