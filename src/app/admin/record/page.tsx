export default function AdminRecordPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center rounded-[32px] bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_42%),linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(240,249,255,0.9))] p-6">
      <div className="w-full max-w-2xl rounded-[28px] border border-sky-100 bg-white/90 px-10 py-14 text-center shadow-[0_30px_80px_-42px_rgba(14,116,144,0.45)] backdrop-blur">
        <h1 className="text-4xl font-semibold tracking-[-0.04em] text-slate-900 sm:text-5xl">
          Upgrade Your Plan
        </h1>
        <p className="mt-4 text-base text-slate-600 sm:text-lg">
          To use this feature
        </p>
      </div>
    </div>
  );
}
