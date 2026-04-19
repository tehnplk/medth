import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type Props = {
  title: string;
  backHref?: string;
};

export default function BookingTopBar({ title, backHref }: Props) {
  return (
    <header className="sticky top-0 z-50 flex flex-shrink-0 items-center gap-2 border-b border-violet-800 bg-violet-600 px-6 py-2 shadow-md shadow-violet-200">
      <div className="flex items-center">
        {backHref && (
          <Link
            href={backHref}
            className="group flex items-center gap-1.5 text-sm font-semibold text-white/90 transition-colors hover:text-white"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition-colors group-hover:bg-white/25">
              <ChevronLeft className="h-4 w-4" />
            </div>
            <span className="inline whitespace-nowrap">ย้อนกลับ</span>
          </Link>
        )}
      </div>

      <h1 className="ml-auto min-w-0 truncate whitespace-nowrap text-right text-sm font-semibold tracking-tight text-white">
        {title}
      </h1>
    </header>
  );
}
