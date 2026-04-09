import Link from "next/link";

type BookingStepsProps = {
  currentStep: number;
  stepLinks?: Array<string | null | undefined>;
};

const steps = ["สาขา", "วันที่", "เวลา", "พนักงาน", "ยืนยัน"];

export default function BookingSteps({ currentStep, stepLinks = [] }: BookingStepsProps) {
  return (
    <div className="mb-4 rounded-2xl border border-sky-200 bg-white/90 p-3 shadow-[0_10px_24px_-18px_rgba(37,99,235,0.24)] backdrop-blur">
      <div className="flex items-center gap-1.5">
        {steps.map((label, index) => {
          const step = index + 1;
          const isDone = step < currentStep;
          const isCurrent = step === currentStep;
          const isLast = index === steps.length - 1;
          const href = stepLinks[index];
          const isClickable = !isCurrent && typeof href === "string" && href.length > 0;

          const content = (
            <div
              className={`min-w-0 flex-1 rounded-xl text-center transition ${
                isClickable ? "cursor-pointer hover:bg-sky-50" : ""
              }`}
            >
              <span
                className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition ${
                  isDone
                    ? "bg-sky-600 text-white"
                    : isCurrent
                      ? "border-2 border-sky-600 bg-white text-sky-700"
                      : "border border-zinc-300 bg-zinc-100 text-zinc-400"
                }`}
              >
                {isDone ? "✓" : step}
              </span>
              <span
                className={`mt-1 block truncate text-[10px] ${
                  isDone || isCurrent ? "text-sky-700" : "text-zinc-400"
                }`}
              >
                {label}
              </span>
            </div>
          );

          return (
            <div key={label} className="flex min-w-0 flex-1 items-center">
              {isClickable ? (
                <Link
                  href={href}
                  aria-label={`ไปที่ขั้นตอน ${label}`}
                  className="block min-w-0 flex-1 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
                >
                  {content}
                </Link>
              ) : (
                content
              )}

              {isLast ? null : (
                <div
                  className={`mx-1 mt-[-12px] h-[2px] flex-1 ${
                    isDone ? "bg-sky-300" : "bg-zinc-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
