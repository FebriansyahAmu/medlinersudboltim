"use client";

import { useState, useEffect } from "react";

export function Clock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-1.5">
      <div
        className="w-1.5 h-1.5 rounded-full bg-[#00875A]"
        style={{ animation: "blink 1.2s step-end infinite" }}
      />
      <span className="font-mono text-sm font-bold text-slate-800 tabular-nums">
        {time || "—"}
      </span>
    </div>
  );
}
