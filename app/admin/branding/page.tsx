"use client";

import { useState, useRef, useEffect } from "react";

interface BuildStatus {
  id?: number;
  status?: string;
  conclusion?: string | null;
  commitMessage?: string;
  createdAt?: string;
  updatedAt?: string;
  htmlUrl?: string;
}

export default function BrandingPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fitMode, setFitMode] = useState<"contain" | "cover">("contain");
  const [bgColor, setBgColor] = useState<string>("#07193F");
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buildStatus, setBuildStatus] = useState<BuildStatus | null>(null);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [githubToken, setGithubToken] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("github_token");
    if (saved) setGithubToken(saved);
  }, []);

  // Handle file selection
  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError(null);
      const url = URL.createObjectURL(selected);
      setPreviewUrl(url);
    }
  }

  // Handle Drag & Drop
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) {
      const selected = e.dataTransfer.files[0];
      setFile(selected);
      setError(null);
      const url = URL.createObjectURL(selected);
      setPreviewUrl(url);
    }
  }

  // Poll GitHub Actions build status
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPolling) {
      interval = setInterval(async () => {
        try {
          const res = await fetch("/api/branding/status", {
            headers: githubToken ? { "x-github-token": githubToken } : {},
          });
          if (res.ok) {
            const data = await res.json();
            setBuildStatus(data);
            if (data.status === "completed") {
              setIsPolling(false);
              setStatusMessage("Build complete! New APK is ready.");
            }
          }
        } catch (e) {
          console.error(e);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isPolling, githubToken]);

  // Submit to API
  async function handleUploadAndDeploy() {
    if (!file) {
      setError("Please select an image file first.");
      return;
    }

    setLoading(true);
    setError(null);
    setStatusMessage("Processing image into Android mipmap sizes & committing to GitHub...");

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("mode", fitMode);
      fd.append("bgColor", bgColor);
      if (githubToken) {
        fd.append("githubToken", githubToken);
        localStorage.setItem("github_token", githubToken);
      }

      const res = await fetch("/api/branding/upload", {
        method: "POST",
        body: fd,
        headers: githubToken ? { "x-github-token": githubToken } : {},
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload image");
      }

      setStatusMessage("Pushed to GitHub successfully! GitHub Actions is now compiling your APK...");
      setIsPolling(true);
    } catch (err: unknown) {
      setError((err as Error).message || "An error occurred");
      setStatusMessage(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div>
        <div className="text-[11px] uppercase tracking-[0.16em] text-[#00D4FF] font-bold">
          Mobile App Customizer
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
          App Icon & Logo Management
        </h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          Upload your exact brand image file directly from your computer or phone. We will automatically generate all Android mipmap resolutions, update the GitHub repository, and compile a new APK.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Left Column: Image Uploader & Settings */}
        <div className="space-y-6">
          <div className="card p-5 space-y-5 bg-[#0A1E4A]/80 border-white/10">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              1. Upload Your Exact Image
            </h2>

            {/* Drag & Drop Zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#00D4FF]/40 hover:border-[#00D4FF] rounded-2xl p-8 text-center cursor-pointer transition bg-white/5 hover:bg-white/10 flex flex-col items-center justify-center gap-3"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={onFileChange}
                className="hidden"
              />

              <div className="w-12 h-12 rounded-full bg-[#00D4FF]/10 text-[#00D4FF] flex items-center justify-center text-xl">
                📁
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  {file ? file.name : "Click to select or drag & drop your image"}
                </p>
                <p className="text-xs text-[var(--muted)] mt-1">
                  Supports high-res PNG, JPEG, SVG, or WebP
                </p>
              </div>
            </div>

            {/* Adjustments */}
            <div className="space-y-4 pt-2 border-t border-white/10">
              <label className="block text-xs font-semibold uppercase text-white/70">
                Fit Mode
              </label>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setFitMode("contain")}
                  className={`py-2 px-3 rounded-lg border font-medium transition ${
                    fitMode === "contain"
                      ? "border-[#00D4FF] bg-[#00D4FF]/15 text-[#00D4FF]"
                      : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
                >
                  Contain (Padded)
                </button>
                <button
                  type="button"
                  onClick={() => setFitMode("cover")}
                  className={`py-2 px-3 rounded-lg border font-medium transition ${
                    fitMode === "cover"
                      ? "border-[#00D4FF] bg-[#00D4FF]/15 text-[#00D4FF]"
                      : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
                >
                  Cover (Edge-to-Edge)
                </button>
              </div>

              {fitMode === "contain" && (
                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-semibold uppercase text-white/70">
                    Background Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border border-white/20 bg-transparent p-0.5"
                    />
                    <input
                      type="text"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="input py-1.5 px-3 text-xs w-28 uppercase font-mono"
                    />
                    <div className="flex gap-1.5">
                      {[
                        { color: "#07193F", label: "Solace Navy" },
                        { color: "#061536", label: "Midnight" },
                        { color: "#000000", label: "Black" },
                        { color: "#FFFFFF", label: "White" },
                      ].map((preset) => (
                        <button
                          key={preset.color}
                          type="button"
                          title={preset.label}
                          onClick={() => setBgColor(preset.color)}
                          style={{ backgroundColor: preset.color }}
                          className={`w-6 h-6 rounded-full border ${
                            bgColor.toUpperCase() === preset.color.toUpperCase()
                              ? "ring-2 ring-[#00D4FF] border-white"
                              : "border-white/20"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* GitHub Token configuration */}
            <div className="pt-2 border-t border-white/10 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase text-white/70">
                  GitHub Personal Access Token
                </label>
                <span className="text-[10px] text-white/40">Optional if set in Vercel</span>
              </div>
              <input
                type="password"
                placeholder="ghp_..."
                value={githubToken}
                onChange={(e) => {
                  setGithubToken(e.target.value);
                  localStorage.setItem("github_token", e.target.value);
                }}
                className="input py-1.5 px-3 text-xs w-full font-mono placeholder:text-white/30"
              />
              <p className="text-[10px] text-[var(--muted)]">
                Used to push updated icons to Duke31/Driver-mobile-app and trigger APK compilation.
              </p>
            </div>

            {/* Error & Status notices */}
            {error && (
              <div className="p-3 text-xs text-[#FF6B6B] bg-[#FF334B]/10 border border-[#FF334B]/30 rounded-lg">
                ⚠️ {error}
              </div>
            )}

            {statusMessage && (
              <div className="p-3 text-xs text-[#00D4FF] bg-[#00D4FF]/10 border border-[#00D4FF]/30 rounded-lg flex items-center gap-2">
                <span className="animate-spin text-sm">⏳</span>
                <span>{statusMessage}</span>
              </div>
            )}

            {/* Action Button */}
            <button
              type="button"
              disabled={loading || !file || isPolling}
              onClick={handleUploadAndDeploy}
              className="btn btn-primary w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="animate-spin">🔄</span> Processing & Committing...
                </>
              ) : isPolling ? (
                <>
                  <span className="animate-spin">⚙️</span> Building APK on GitHub...
                </>
              ) : (
                <>
                  <span>🚀</span> Apply to Mobile App & Rebuild APK
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Live Icon Previews */}
        <div className="space-y-6">
          <div className="card p-5 space-y-5 bg-[#0A1E4A]/80 border-white/10">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              2. Live Android Preview
            </h2>

            <div className="grid grid-cols-2 gap-4">
              {/* Squircle Preview */}
              <div className="flex flex-col items-center p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                <span className="text-[11px] font-medium text-white/70 mb-3">
                  Launcher Squircle
                </span>
                <div
                  style={{ backgroundColor: bgColor }}
                  className="w-24 h-24 rounded-[26px] shadow-2xl flex items-center justify-center overflow-hidden border border-white/10"
                >
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className={`w-full h-full ${
                        fitMode === "cover" ? "object-cover" : "object-contain p-2.5"
                      }`}
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src="/solace_icon.png"
                      alt="Current"
                      className="w-full h-full object-contain p-2"
                    />
                  )}
                </div>
                <span className="text-xs text-white mt-2 font-medium">Solace Driver</span>
              </div>

              {/* Circle Preview (Google Pixel / Samsung) */}
              <div className="flex flex-col items-center p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                <span className="text-[11px] font-medium text-white/70 mb-3">
                  Round Launcher
                </span>
                <div
                  style={{ backgroundColor: bgColor }}
                  className="w-24 h-24 rounded-full shadow-2xl flex items-center justify-center overflow-hidden border border-white/10"
                >
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className={`w-full h-full ${
                        fitMode === "cover" ? "object-cover" : "object-contain p-3.5"
                      }`}
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src="/solace_icon.png"
                      alt="Current"
                      className="w-full h-full object-contain p-2.5"
                    />
                  )}
                </div>
                <span className="text-xs text-white mt-2 font-medium">Solace Driver</span>
              </div>
            </div>

            {/* In-App Header Preview */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <span className="text-[11px] font-medium text-white/70">In-App Header Avatar</span>
              <div className="p-2.5 rounded-lg bg-[#07193F] border border-white/10 flex items-center gap-3">
                <div
                  style={{ backgroundColor: bgColor }}
                  className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center shrink-0 border border-white/10"
                >
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-full object-contain p-0.5"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src="/solace_icon.png"
                      alt="Current"
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Driver Unit 01</div>
                  <div className="text-[10px] text-[#00D4FF] font-semibold">
                    Solace Fleet • In Service
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* GitHub Actions Live Build Monitor */}
          <div className="card p-5 space-y-4 bg-[#0A1E4A]/80 border-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                3. Build Status & Download
              </h2>
              <a
                href="https://github.com/Duke31/Driver-mobile-app/actions"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[#00D4FF] hover:underline"
              >
                GitHub Actions ↗
              </a>
            </div>

            {buildStatus && (
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Status:</span>
                  <span
                    className={`font-bold uppercase tracking-wider px-2 py-0.5 rounded text-[10px] ${
                      buildStatus.status === "completed"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-amber-500/20 text-amber-400 animate-pulse"
                    }`}
                  >
                    {buildStatus.status === "completed"
                      ? buildStatus.conclusion
                      : buildStatus.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Commit:</span>
                  <span className="text-white truncate max-w-[200px]">
                    {buildStatus.commitMessage}
                  </span>
                </div>
              </div>
            )}

            <div className="pt-2">
              <a
                href="/solace-driver.apk"
                download="solace-driver.apk"
                className="btn btn-secondary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
              >
                <span>📲</span>
                <span>Download Current Solace Driver APK</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Manual GitHub Web Guide */}
      <div className="card p-6 bg-[#061536] border-white/10 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <span>🛠️</span>
          <span>Prefer to edit files directly on GitHub?</span>
        </h3>
        <p className="text-xs text-[var(--muted)] leading-relaxed">
          If you prefer to drag and drop your exact original graphic file directly on GitHub.com without using the uploader above, you can replace the files at the following repository paths:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3 rounded-lg bg-black/40 border border-white/10 space-y-1">
            <div className="text-[10px] uppercase text-[#00D4FF] font-sans font-bold">
              Main App Asset
            </div>
            <div className="text-white break-all">assets/images/solace_logo.png</div>
          </div>
          <div className="p-3 rounded-lg bg-black/40 border border-white/10 space-y-1">
            <div className="text-[10px] uppercase text-[#00D4FF] font-sans font-bold">
              High-Res Launcher Icon
            </div>
            <div className="text-white break-all">
              android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png
            </div>
          </div>
        </div>

        <div className="pt-2">
          <a
            href="https://github.com/Duke31/Driver-mobile-app/tree/main/android/app/src/main/res"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-[#00D4FF] hover:underline inline-flex items-center gap-1 font-semibold"
          >
            Open GitHub Repository Resource Folder ↗
          </a>
        </div>
      </div>
    </div>
  );
}
