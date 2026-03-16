"use client";

import { useState } from "react";
import Header from "../components/ambilAntrean/Header";
import CounterStrip from "../components/ambilAntrean/CounterStrip";
import AmbilButton from "../components/ambilAntrean/AmbilButton";
import PrintArea from "../components/ambilAntrean/PrintArea";

export default function KioskPage() {
  const [loading, setLoading] = useState(false);
  const [nomor, setNomor] = useState("");
  const [waktu, setWaktu] = useState("");

  async function ambil() {
    setLoading(true);

    const res = await fetch("/api/queue", { method: "POST" });
    const data = await res.json();

    const d = new Date(data.waktu);

    setNomor(data.nomor);
    setWaktu(d.toLocaleString("id-ID"));

    setTimeout(() => {
      window.print();
      setLoading(false);
    }, 200);
  }

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <Header />

        <CounterStrip menunggu={0} total={0} />

        <AmbilButton loading={loading} onClick={ambil} />

        <p className="text-xs text-slate-400 text-center">
          Serahkan tiket kepada petugas farmasi
        </p>
      </div>

      <PrintArea nomor={nomor} waktu={waktu} />
    </main>
  );
}
