"use client";

import { ReactNode } from "react";

type Props = {
  loading?: boolean;
  children: ReactNode;
  type?: "button" | "submit";
};

export default function Button({ loading, children, type = "button" }: Props) {
  return (
    <button
      type={type}
      disabled={loading}
      className="w-full bg-emerald-700 cursor-pointer hover:bg-emerald-800 disabled:opacity-50 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition shadow"
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      )}

      {!loading && children}
    </button>
  );
}
