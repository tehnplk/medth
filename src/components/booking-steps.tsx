import Link from "next/link";

type BookingStepsProps = {
  currentStep: number;
  stepLinks?: Array<string | null | undefined>;
};

const steps = ["สาขา", "วันที่", "เวลา", "พนักงาน", "ยืนยัน"];

export default function BookingSteps({ currentStep, stepLinks = [] }: BookingStepsProps) {
  return (
    <div className="flex items-center border-b border-sky-100 bg-white px-4 pb-3 pt-1">
      {steps.map((label, index) => {
        const step = index + 1;
        const isDone = step < currentStep;
        const isCurrent = step === currentStep;
        const isLast = index === steps.length - 1;
        const href = stepLinks[index];
        const isClickable = !isCurrent && typeof href === "string" && href.length > 0;

        const content = (
          <div
            className={`min-w-0 flex-1 text-center ${isClickable ? "cursor-pointer" : ""}`}
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
                className="block min-w-0 flex-1 outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                {content}
              </Link>
            ) : (
              content
            )}
            {isLast ? null : (
              <div
                className={`mx-1 mt-[-12px] h-[2px] flex-1 ${isDone ? "bg-sky-300" : "bg-zinc-200"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
