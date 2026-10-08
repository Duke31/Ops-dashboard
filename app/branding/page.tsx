import { BrandingStudio } from "@/components/BrandingStudio";

export default function StandaloneBrandingPage() {
  return (
    <div className="min-h-dvh bg-[#07193F] text-white p-4 sm:p-8" data-theme="dark">
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/solace_icon.png"
            alt="Solace"
            className="w-9 h-9 rounded-xl object-contain shadow-md"
          />
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-[#00D4FF]">
              Solace Dispatch
            </div>
            <div className="text-sm font-semibold text-white">App Asset Studio</div>
          </div>
        </div>
        <a
          href="/login"
          className="text-xs text-[#00D4FF] hover:underline border border-[#00D4FF]/30 px-3 py-1.5 rounded-lg bg-[#00D4FF]/10 transition-colors"
        >
          Staff Sign In →
        </a>
      </div>
      <BrandingStudio />
    </div>
  );
}
