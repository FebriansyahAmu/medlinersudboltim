"use client";

import { useState, useEffect } from "react";
import type { Antrean, JenisResep } from "@/app/types/antrianTypes";

// ── Jenis resep options ───────────────────────────────────────
const JR_OPTIONS: {
  key: string;
  value: JenisResep;
  label: string;
  sub: string;
  colors: [string, string];
}[] = [
  {
    key: "non-racikan",
    value: "Non Racik",
    label: "Non Racikan",
    sub: "Obat jadi",
    colors: ["#BFDBFE", "#EFF6FF"],
  },
  {
    key: "racikan",
    value: "Racikan",
    label: "Racikan",
    sub: "Dibuat khusus",
    colors: ["#FDE68A", "#FFFBEB"],
  },
  {
    key: "tidak-ada",
    value: "Tidak ada",
    label: "Tidak Ada",
    sub: "Tanpa obat",
    colors: ["#CBD5E1", "#F8FAFC"],
  },
];

// ─────────────────────────────────────────────────────────────
interface SaveData {
  nomorAntrian: string;
  kodeBooking: string;
  namaPasien: string;
  jenisResep: JenisResep;
}

interface Props {
  nomorAntrian: string;
  antrean: Antrean | null;
  isLoading?: boolean;
  onSave: (data: SaveData) => void;
  onClose: () => void;
}

export function ModalLengkapi({
  nomorAntrian,
  antrean,
  isLoading,
  onSave,
  onClose,
}: Props) {
  const [kodeBooking, setKodeBooking] = useState(antrean?.kodeBooking ?? "");
  const [namaPasien, setNamaPasien] = useState(antrean?.namaPasien ?? "");
  const [jenisResep, setJenisResep] = useState<JenisResep | "">(
    antrean?.jenisResep ?? "",
  );

  // Sync jika antrean berubah
  useEffect(() => {
    setKodeBooking(antrean?.kodeBooking ?? "");
    setNamaPasien(antrean?.namaPasien ?? "");
    setJenisResep(antrean?.jenisResep ?? "");
  }, [antrean]);

  const isValid = kodeBooking.trim() && namaPasien.trim() && jenisResep;

  function handleSave() {
    if (!isValid) return;
    onSave({
      nomorAntrian,
      kodeBooking: kodeBooking.trim().toUpperCase(),
      namaPasien: namaPasien.trim(),
      jenisResep: jenisResep as JenisResep,
    });
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,.5)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              Lengkapi Data Pasien
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Antrian{" "}
              <span className="font-mono font-semibold text-slate-600">
                {nomorAntrian}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-400 text-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Kode Booking */}
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
              Kode Booking <span className="text-red-400">*</span>
              <span className="font-normal text-slate-300 ml-1">
                (dari SEP / pendaftaran)
              </span>
            </label>
            <input
              type="text"
              value={kodeBooking}
              onChange={(e) => setKodeBooking(e.target.value.toUpperCase())}
              placeholder="16032026A001"
              className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-[#00875A] focus:ring-2 focus:ring-[#00875A]/10 transition-all"
            />
          </div>

          {/* Nama Pasien */}
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
              Nama Pasien <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={namaPasien}
              onChange={(e) => setNamaPasien(e.target.value)}
              placeholder="Nama lengkap pasien"
              className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#00875A] focus:ring-2 focus:ring-[#00875A]/10 transition-all"
            />
          </div>

          {/* Jenis Resep */}
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
              Jenis Resep <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {JR_OPTIONS.map((opt) => {
                const isSelected = jenisResep === opt.value;
                const [borderSel, bgSel] = opt.colors;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setJenisResep(opt.value)}
                    className="text-center p-3 rounded-xl border-2 transition-all hover:border-[#57C4A0]"
                    style={{
                      borderColor: isSelected ? borderSel : "#E2E8F0",
                      background: isSelected ? bgSel : "#fff",
                    }}
                  >
                    <p className="text-xs font-semibold text-slate-700">
                      {opt.label}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{opt.sub}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl border-2 border-slate-200 text-slate-500 hover:bg-slate-50 transition-all"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid || isLoading}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: isValid ? "#1D6FA4" : "#94A3B8" }}
          >
            {isLoading ? (
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            )}
            Simpan &amp; Panggil
          </button>
        </div>
      </div>
    </div>
  );
}
