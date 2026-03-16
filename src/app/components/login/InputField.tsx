"use client";

import { Field, ErrorMessage } from "formik";

type Props = {
  label: string;
  name: string;
  placeholder?: string;
  type?: string;
};

export default function InputField({
  label,
  name,
  placeholder,
  type = "text",
}: Props) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">
        {label}
      </label>

      <Field
        name={name}
        type={type}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
      />

      <ErrorMessage
        name={name}
        component="p"
        className="text-xs text-red-500 mt-1"
      />
    </div>
  );
}
