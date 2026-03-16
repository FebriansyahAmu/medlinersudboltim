import Image from "next/image";
import LoginCard from "./components/login/LoginCard";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <LoginCard />
    </main>
  );
}
