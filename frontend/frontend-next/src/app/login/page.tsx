"use client";

import { useRouter } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { useAuthStore } from "@/store/authStore";

export default function LoginPage() {
  const router = useRouter();
  const { setToken } = useAuthStore();

  const handleLogin = async (data: any) => {
    const res = await fetch("http://localhost:8080/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.email, password: data.password }),
    });

    if (!res.ok) {
      let errorMessage = "Ошибка входа";
      try {
        const errData = await res.json();
        errorMessage = errData.message || errorMessage;
      } catch (jsonErr) {
        // Если json() упал — читаем как текст
        errorMessage = (await res.text()) || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const { accessToken } = await res.json();
    setToken(accessToken);
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center">Вход</h1>
        <AuthForm type="login" onSubmit={handleLogin} />
        <p className="mt-4 text-center text-sm">
          Нет аккаунта?{" "}
          <a href="/register" className="text-blue-600 hover:underline">
            Зарегистрироваться
          </a>
        </p>
      </div>
    </div>
  );
}
