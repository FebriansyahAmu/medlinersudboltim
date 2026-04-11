// Halaman login.
// Proxy (src/proxy.ts) sudah menangani redirect user yang sudah login
// ke landing page sesuai role, jadi di sini cukup render form saja.

import { LoginForm } from "./components/login/LoginForm";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center px-6">
      <LoginForm />
    </div>
  );
}
