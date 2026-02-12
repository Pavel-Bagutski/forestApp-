"use client"; // обязательно, чтобы использовать хуки

import Link from "next/link";
import { useAuthStore } from "@/store/authStore";

export default function Navbar() {
  const { token, logout } = useAuthStore();

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="shrink-0">
            <Link href="/" className="text-xl font-bold text-green-700">
              Грибные места 🍄
            </Link>
          </div>

          <div className="flex items-center space-x-6">
            <Link
              href="/map"
              className="text-gray-700 hover:text-green-600 font-medium transition-colors"
            >
              Карта
            </Link>

            <Link
              href="/add-place"
              className="text-gray-700 hover:text-green-600 font-medium transition-colors"
            >
              Добавить место
            </Link>

            {!token && (
              <>
                <Link
                  href="/register"
                  className="text-gray-700 hover:text-green-600 font-medium transition-colors"
                >
                  Регистрация
                </Link>
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-green-600 font-medium transition-colors"
                >
                  Вход
                </Link>
              </>
            )}

            {token && (
              <>
                <Link
                  href="/dashboard"
                  className="text-gray-700 hover:text-green-600 font-medium transition-colors"
                >
                  Дашборд
                </Link>
                <button
                  onClick={logout}
                  className="text-red-600 hover:text-red-800 font-medium transition-colors"
                >
                  Выйти
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
