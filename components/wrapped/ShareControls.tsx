"use client";

import { useState } from "react";
import type { WrappedSlide } from "@/lib/wrapped/types";
import { getDictionary, t } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";

interface ShareControlsProps {
  year: number;
  username: string;
  currentSlide: WrappedSlide;
  initialIsPublic: boolean;
  onClose: () => void;
  locale: Locale;
}

type ExportFormat = "story" | "post" | "twitter";

/**
 * ⚠️ Compartir es una acción consciente (Fase 4, Consideraciones): este
 * panel es la ÚNICA superficie que puede activar `isPublic` — el toggle
 * empieza siempre apagado a menos que ya se haya activado antes
 * (`initialIsPublic`), nunca se activa solo, y cada cambio requiere un
 * click explícito del dueño.
 */
export function ShareControls({
  year,
  username,
  currentSlide,
  initialIsPublic,
  onClose,
  locale
}: ShareControlsProps) {
  const dict = getDictionary(locale).wrapped.share;
  const FORMAT_LABELS: Record<ExportFormat, string> = {
    story: dict.formatStory,
    post: dict.formatPost,
    twitter: dict.formatTwitter
  };

  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [updating, setUpdating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("story");

  const publicUrl =
    typeof window !== "undefined" ? `${window.location.origin}/${username}/wrapped/${year}` : "";

  async function togglePublic() {
    setUpdating(true);
    const next = !isPublic;
    const res = await fetch("/wrapped", {
      method: "PATCH",
      body: JSON.stringify({ year, isPublic: next })
    });
    if (res.ok) setIsPublic(next);
    setUpdating(false);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareLink() {
    if (navigator.share) {
      await navigator.share({ title: t(dict.shareTitlePrefix, { year }), url: publicUrl }).catch(() => {});
    } else {
      await copyLink();
    }
  }

  const imageUrl = `/wrapped/${year}/image?slide=${currentSlide.kind}&format=${format}`;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 px-6">
      <div className="w-full max-w-sm rounded-2xl border border-wrapped-border bg-wrapped-card p-6 text-left">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-white">{dict.title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-neutral-400 hover:text-white"
            aria-label={dict.closeAria}
          >
            ✕
          </button>
        </div>

        <div className="mb-4 flex items-center justify-between rounded-lg border border-wrapped-border p-3">
          <div>
            <p className="text-sm text-neutral-200">
              {isPublic ? dict.isPublicLabel : dict.isPrivateLabel}
            </p>
            <p className="text-xs text-neutral-500">
              {isPublic ? dict.isPublicDescription : dict.isPrivateDescription}
            </p>
          </div>
          <button
            type="button"
            onClick={togglePublic}
            disabled={updating}
            className={`rounded-full px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
              isPublic ? "bg-white/10 text-neutral-200" : "bg-wrapped-accent text-black"
            }`}
          >
            {isPublic ? dict.makePrivate : dict.makePublic}
          </button>
        </div>

        {isPublic && (
          <div className="mb-4 flex gap-2">
            <input
              readOnly
              value={publicUrl}
              className="min-w-0 flex-1 rounded-lg border border-wrapped-border bg-black/20 px-3 py-2 text-xs text-neutral-300"
            />
            <button
              type="button"
              onClick={copyLink}
              className="shrink-0 rounded-lg bg-white/10 px-3 py-2 text-xs text-white hover:bg-white/20"
            >
              {copied ? dict.copied : dict.copy}
            </button>
            <button
              type="button"
              onClick={shareLink}
              className="shrink-0 rounded-lg bg-wrapped-accent px-3 py-2 text-xs font-medium text-black hover:opacity-90"
            >
              {dict.shareButton}
            </button>
          </div>
        )}

        <div className="border-t border-wrapped-border pt-4">
          <p className="mb-2 text-sm text-neutral-300">{dict.downloadSectionTitle}</p>
          <div className="mb-3 flex gap-2">
            {(Object.keys(FORMAT_LABELS) as ExportFormat[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                className={`rounded-full px-3 py-1 text-xs ${
                  format === f ? "bg-wrapped-accent text-black" : "bg-white/10 text-neutral-300"
                }`}
              >
                {FORMAT_LABELS[f]}
              </button>
            ))}
          </div>
          <a
            href={imageUrl}
            download={`wrapped-${year}-${currentSlide.kind}-${format}.png`}
            className="block w-full rounded-lg bg-white/10 px-4 py-2 text-center text-sm text-white hover:bg-white/20"
          >
            {dict.downloadPng}
          </a>
        </div>
      </div>
    </div>
  );
}
