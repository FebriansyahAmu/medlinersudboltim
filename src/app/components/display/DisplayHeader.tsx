"use client";

import { useState, useEffect } from "react";

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agt",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

interface Props {
  unitId: number;
}

export function DisplayHeader({ unitId }: Props) {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    function tick() {
      const n = new Date();
      setTime(
        [n.getHours(), n.getMinutes(), n.getSeconds()]
          .map((v) => String(v).padStart(2, "0"))
          .join(":"),
      );
      setDate(
        `${DAYS[n.getDay()]}, ${n.getDate()} ${MONTHS[n.getMonth()]} ${n.getFullYear()}`,
      );
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="bg-white border-b border-[#E8EEF4] p-5 px-20 flex items-center justify-between">
      {/* Kiri — logo RS */}
      <div className="flex items-center gap-3">
        <img
          src="/medline-log.png"
          alt="MedLine RSUD BOLTIM"
          className="h-9 w-9 rounded-[10px] object-contain"
        />
        <div>
          <div className="text-sm font-semibold text-[#334155] leading-tight">
            UPTD RSUD BOLTIM
          </div>
          <div className="text-[11px] text-[#94A3B8] font-normal">
            Instalasi Farmasi · BPJS Kesehatan
          </div>
        </div>
      </div>

      {/* Tengah — judul */}
      <div className="text-xl font-semibold text-[#334155]">
        Antrian Farmasi
      </div>

      {/* Kanan — jam & tanggal */}
      <div className="text-right">
        <div
          className="font-mono font-bold leading-none tabular-nums"
          style={{ fontSize: 24, color: "#00875A", letterSpacing: 1 }}
        >
          {time || "--:--:--"}
        </div>
        <div className="text-[11px] text-[#94A3B8] mt-0.5">{date || "—"}</div>
      </div>
    </header>
  );
}
