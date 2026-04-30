import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type Props = {
  title: string;
  backHref?: string;
};

export default function BookingTopBar({ title, backHref }: Props) {
  return (
    <header className="sticky top-0 z-50 flex h-[55px] flex-shrink-0 items-center gap-2 border-b border-violet-800 bg-violet-600 px-6 shadow-md shadow-violet-200">
      <div className="flex min-w-0 items-center gap-1.5 text-white">
        {backHref && (
          <Link
            href={backHref}
            aria-label="ย้อนกลับ"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
        )}
        <h1 className="min-w-0 truncate whitespace-nowrap text-sm font-semibold tracking-tight">
          {title}
        </h1>
      </div>

      {backHref && (
        <Link
          href={backHref}
          className="ml-auto inline-flex items-center rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold text-white/90 transition-colors hover:bg-white/25 hover:text-white"
        >
          ย้อนกลับ
        </Link>
      )}
    </header>
  );
}
