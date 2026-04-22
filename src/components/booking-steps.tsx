import { Fragment } from "react";
import Link from "next/link";

type BookingStepsProps = {
  currentStep: number;
  stepLinks?: Array<string | null | undefined>;
};

const steps = ["สาขา", "วันที่", "เวลา", "พนักงาน", "ยืนยัน"];

export default function BookingSteps({ currentStep, stepLinks = [] }: BookingStepsProps) {
  return (
    <div className="bg-white px-2 py-2 sm:px-6">
      <div className="flex items-center">
        {steps.map((label, index) => {
          const step = index + 1;
          const isDone = step < currentStep;
          const isCurrent = step === currentStep;
          const isLast = index === steps.length - 1;
          const href = stepLinks[index];
          const isClickable = !isCurrent && typeof href === "string" && href.length > 0;

          const content = (
            <div className={`flex flex-col items-center gap-1 ${isClickable ? "group cursor-pointer" : ""}`}>
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                  isDone
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-200"
                    : isCurrent
                      ? "ring-2 ring-violet-600 ring-offset-2 bg-violet-600 text-white shadow-lg shadow-violet-100"
                      : "bg-slate-50 text-slate-400 ring-1 ring-slate-200"
                }`}
              >
                {isDone ? <span className="text-sm">✓</span> : <span>{step}</span>}
              </div>
              <span
                className={`w-full overflow-hidden text-ellipsis whitespace-nowrap text-center text-[11px] font-bold tracking-tight uppercase transition-colors duration-300 ${
                  isDone || isCurrent ? "text-violet-700" : "text-slate-400"
                }`}
              >
                {label}
              </span>
            </div>
          );

          return (
            <Fragment key={label}>
              <div className="flex flex-1 justify-center">
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
                <div className="mx-2 mb-5 flex-1">
                  <div className={`h-[2px] w-full rounded-full transition-colors duration-500 ${isDone ? "bg-violet-500" : "bg-slate-100"}`} />
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
