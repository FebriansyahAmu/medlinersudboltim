"use client";

import { useRouter } from "next/navigation";
import { Formik, Form } from "formik";
import InputField from "./InputField";
import PasswordField from "./PasswordField";
import Button from "./Button";
import { loginSchema } from "@/app/lib/validation/loginSchema";

export default function LoginCard() {
  const router = useRouter();

  const handleSubmit = async (
    values: { username: string; password: string },
    setSubmitting: (isSubmitting: boolean) => void,
    setFieldError: (field: string, message: string) => void,
  ) => {
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (!res.ok) {
        setFieldError("username", data.message || "Login gagal");
        return;
      }

      // simpan token
      localStorage.setItem("token", data.token);

      // redirect
      router.push("/dashboard");
    } catch (error) {
      setFieldError("username", "Server error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white w-full max-w-md rounded-3xl px-10 py-12 shadow-xl">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Antrian Farmasi</h1>
        <p className="text-sm text-slate-400">RSUD BOLTIM · BPJS</p>
      </div>

      <Formik
        initialValues={{
          username: "",
          password: "",
        }}
        validationSchema={loginSchema}
        onSubmit={(values, { setSubmitting, setFieldError }) =>
          handleSubmit(values, setSubmitting, setFieldError)
        }
      >
        {({ isSubmitting }) => (
          <Form className="space-y-4">
            <InputField
              label="Username / Email"
              name="username"
              placeholder="Masukkan username"
            />

            <PasswordField name="password" />

            <Button loading={isSubmitting} type="submit">
              Masuk
            </Button>
          </Form>
        )}
      </Formik>
    </div>
  );
}
