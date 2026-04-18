import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type Props = {
  title: string;
  backHref?: string;
};

export default function BookingTopBar({ title, backHref }: Props) {
  return (
    <header className="sticky top-0 z-50 flex flex-shrink-0 items-center gap-2 border-b border-slate-100 bg-white/80 px-6 py-2 backdrop-blur-md">
      <div className="flex items-center">
        {backHref && (
          <Link
            href={backHref}
            className="group flex items-center gap-1.5 text-sm font-semibold text-slate-600 transition-colors hover:text-sky-600"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 transition-colors group-hover:bg-sky-50">
              <ChevronLeft className="h-4 w-4" />
            </div>
            <span className="inline whitespace-nowrap">ย้อนกลับ</span>
          </Link>
        )}
      </div>

      <h1 className="ml-auto min-w-0 truncate whitespace-nowrap text-right text-sm font-semibold tracking-tight text-slate-900">
        {title}
      </h1>
    </header>
  );
}
