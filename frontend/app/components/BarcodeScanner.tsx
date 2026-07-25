"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

type Props = {
  open: boolean;
  onClose: () => void;
  onScan: (isbn: string) => void;
};

function normalizeIsbn(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 13) return digits;
  return "";
}

export default function BarcodeScanner({ open, onClose, onScan }: Props) {
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  const regionId = "bs-barcode-reader";

  onScanRef.current = onScan;
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setError("");
    setStarting(true);

    const stop = async () => {
      const s = scannerRef.current;
      scannerRef.current = null;
      if (!s) return;
      try {
        if (s.isScanning) await s.stop();
        await s.clear();
      } catch {
        /* already stopped */
      }
    };

    const start = async () => {
      try {
        const scanner = new Html5Qrcode(regionId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 8,
            qrbox: { width: 260, height: 140 },
            aspectRatio: 1.5,
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.CODE_128,
            ],
          },
          (decoded) => {
            const isbn = normalizeIsbn(decoded);
            if (!isbn) return;
            onScanRef.current(isbn);
            void stop();
            onCloseRef.current();
          },
          () => {
            /* ignore frame miss */
          }
        );
      } catch (e: unknown) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "";
          setError(
            msg.includes("Permission")
              ? "Camera permission denied — allow camera and try again"
              : "Could not open camera. Use HTTPS (or localhost) and allow camera access."
          );
        }
      } finally {
        if (!cancelled) setStarting(false);
      }
    };

    const t = setTimeout(() => {
      void start();
    }, 50);

    return () => {
      cancelled = true;
      clearTimeout(t);
      void stop();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h2
            className="text-lg text-[#D4AF37]"
            style={{ fontFamily: "var(--font-display), Georgia, serif" }}
          >
            Scan ISBN barcode
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm"
          >
            Close
          </button>
        </div>
        <p className="text-sm text-slate-400 mb-3">
          Point your camera at the barcode on the back of the book.
        </p>
        <div
          id={regionId}
          className="overflow-hidden rounded-lg bg-black min-h-[220px]"
        />
        {starting && (
          <p className="mt-2 text-sm text-slate-400">Starting camera…</p>
        )}
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}
