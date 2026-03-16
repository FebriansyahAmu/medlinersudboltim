"use client";

import { useState } from "react";
import { useField } from "formik";

type Props = {
  name: string;
};

export default function PasswordField({ name }: Props) {
  const [show, setShow] = useState(false);
  const [field, meta] = useField(name);

  return (
    <div>
      <div className="flex justify-between">
        <label className="text-xs font-semibold text-slate-600 uppercase">
          Kata Sandi
        </label>

        <a href="#" className="text-xs text-emerald-700">
          Lupa?
        </a>
      </div>

      <div className="relative mt-1">
        <input
          {...field}
          type={show ? "text" : "password"}
          className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
        />

        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
        >
          👁
        </button>
      </div>

      {meta.touched && meta.error && (
        <p className="text-red-500 text-xs mt-1">{meta.error}</p>
      )}
    </div>
  );
}
