import Link from "next/link";

type BookingStepsProps = {
  currentStep: number;
  stepLinks?: Array<string | null | undefined>;
};

const steps = ["สาขา", "วันที่", "เวลา", "พนักงาน", "ยืนยัน"];

export default function BookingSteps({ currentStep, stepLinks = [] }: BookingStepsProps) {
  return (
    <div className="bg-white px-2 py-6 sm:px-6">
      <div className="flex items-center justify-between gap-2">
        {steps.map((label, index) => {
          const step = index + 1;
          const isDone = step < currentStep;
          const isCurrent = step === currentStep;
          const isLast = index === steps.length - 1;
          const href = stepLinks[index];
          const isClickable = !isCurrent && typeof href === "string" && href.length > 0;

          const content = (
            <div className={`flex flex-col items-center gap-2 ${isClickable ? "group cursor-pointer" : ""}`}>
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 ${
                  isDone
                    ? "bg-sky-600 text-white shadow-lg shadow-sky-200"
                    : isCurrent
                      ? "ring-2 ring-sky-600 ring-offset-2 bg-sky-600 text-white shadow-lg shadow-sky-100"
                      : "bg-slate-50 text-slate-400 ring-1 ring-slate-200"
                }`}
              >
                {isDone ? <span className="text-base">✓</span> : <span>{step}</span>}
              </div>
              <span
                className={`text-[11px] font-bold tracking-tight uppercase transition-colors duration-300 ${
                  isDone || isCurrent ? "text-sky-700" : "text-slate-400"
                }`}
              >
                {label}
              </span>
            </div>
          );

          return (
            <div key={label} className="flex flex-1 items-center last:flex-none">
              <div className="flex-1">
                {isClickable ? (
                  <Link
                    href={href}
                    className="block outline-none transition-transform active:scale-95"
                  >
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </div>
              {!isLast && (
                <div className="mx-2 mb-6 flex-1">
                  <div className={`h-[2px] w-full rounded-full transition-colors duration-500 ${isDone ? "bg-sky-500" : "bg-slate-100"}`} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
