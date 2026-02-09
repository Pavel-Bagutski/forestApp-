"use client";

import { useState } from "react";

type AuthFormProps = {
  type: "login" | "register";
  onSubmit: (data: any) => Promise<void>;
};

export default function AuthForm({ type, onSubmit }: AuthFormProps) {
  const [form, setForm] = useState({
    email: "",
    password: "",
    username: type === "register" ? "" : undefined,
    firstName: type === "register" ? "" : undefined,
    lastName: type === "register" ? "" : undefined,
  });

  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await onSubmit(form);
    } catch (err: any) {
      setError(err.message || "Ошибка на сервере");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        name="email"
        type="email"
        placeholder="Email"
        value={form.email}
        onChange={handleChange}
        required
        className="w-full p-3 border rounded"
      />

      {type === "register" && (
        <>
          <input
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={handleChange}
            required
            className="w-full p-3 border rounded"
          />
          <input
            name="firstName"
            placeholder="Имя"
            value={form.firstName}
            onChange={handleChange}
            className="w-full p-3 border rounded"
          />
          <input
            name="lastName"
            placeholder="Фамилия"
            value={form.lastName}
            onChange={handleChange}
            className="w-full p-3 border rounded"
          />
        </>
      )}

      <input
        name="password"
        type="password"
        placeholder="Пароль"
        value={form.password}
        onChange={handleChange}
        required
        className="w-full p-3 border rounded"
      />

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700"
      >
        {type === "login" ? "Войти" : "Зарегистрироваться"}
      </button>
    </form>
  );
}
