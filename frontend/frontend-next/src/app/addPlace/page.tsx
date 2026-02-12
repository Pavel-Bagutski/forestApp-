"use client"; // Директива Next.js - компонент выполняется на клиенте (браузер), не на сервере

// Импорты React и Next.js
import { useState, useEffect } from "react"; // useState - для состояния, useEffect - для побочных эффектов
import { useRouter } from "next/navigation"; // Хук для программной навигации между страницами
import { useAuthStore } from "@/store/authStore"; // Zustand store для получения JWT токена
import api from "@/lib/axios"; // Настроенный экземпляр axios с базовым URL и интерцепторами

// Интерфейс TypeScript - описывает структуру объекта типа гриба
// Используется для типизации массива mushroomTypes
interface MushroomType {
  id: number; // Числовой идентификатор из базы данных
  name: string; // Название гриба (например: "Белый гриб")
}

// Главный компонент страницы добавления места
export default function AddPlacePage() {
  // ═════════════════════════════════════════════════════════════════
  // ХУКИ NEXT.JS И АВТОРИЗАЦИИ
  // ═════════════════════════════════════════════════════════════════

  const router = useRouter(); // Получаем объект роутера для редиректов
  const { token } = useAuthStore(); // Деструктуризация - достаём token из глобального состояния

  // ═════════════════════════════════════════════════════════════════
  // СОСТОЯНИЕ ФОРМЫ (useState)
  // ═════════════════════════════════════════════════════════════════

  // Объект form хранит все поля формы в одном состоянии
  // Каждое поле - строка (даже числа, потом конвертируем)
  const [form, setForm] = useState({
    title: "", // Название места - обязательное поле
    description: "", // Описание - опциональное
    address: "", // Адрес/район - опциональное, для отображения на карте
    latitude: "", // Широта - строка для input type="number"
    longitude: "", // Долгота - строка для input type="number"
    mushroomTypeId: "", // ID типа гриба - пустая строка = не выбрано
  });

  // ═════════════════════════════════════════════════════════════════
  // ДОПОЛНИТЕЛЬНОЕ СОСТОЯНИЕ
  // ═════════════════════════════════════════════════════════════════

  // Массив типов грибов, загружается с API при монтировании компонента
  const [mushroomTypes, setMushroomTypes] = useState<MushroomType[]>([]);

  // Массив выбранных файлов для загрузки (объекты File из input)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Массив URL для превью (base64 строки, созданные FileReader)
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // Строка ошибки - если не пустая, показывается красный блок
  const [error, setError] = useState("");

  // Строка успеха - если не пустая, показывается зелёный блок
  const [success, setSuccess] = useState("");

  // Флаг процесса отправки - блокирует кнопки и показывает "Сохранение..."
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ═════════════════════════════════════════════════════════════════
  // ПОБОЧНЫЙ ЭФФЕКТ (useEffect) - загрузка типов грибов
  // ═════════════════════════════════════════════════════════════════

  // Выполняется один раз при монтировании компонента (пустой массив зависимостей [])
  useEffect(() => {
    // Асинхронная функция внутри useEffect (нельзя сделать сам useEffect async)
    const fetchTypes = async () => {
      try {
        // GET запрос к /api/mushroom-types - получаем список типов
        const res = await api.get("/api/mushroom-types");
        // Сохраняем в состояние - будет использовано в select
        setMushroomTypes(res.data);
      } catch (err) {
        // Ошибка не критична, просто логируем
        console.error("Ошибка загрузки типов:", err);
      }
    };
    // Вызываем функцию
    fetchTypes();
  }, []); // Пустой массив = эффект выполнится только при монтировании

  // ═════════════════════════════════════════════════════════════════
  // ОБРАБОТЧИКИ СОБЫТИЙ
  // ═════════════════════════════════════════════════════════════════

  // Универсальный обработчик изменения полей формы
  // Работает для input, textarea и select
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    // Вычисляемое свойство [e.target.name] позволяет использовать один обработчик для всех полей
    // Например: name="title" → обновится form.title
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Обработчик выбора файлов через input type="file"
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Array.from преобразует FileList в обычный массив
    const files = Array.from(e.target.files || []);

    // Фильтрация файлов - проверяем тип и размер
    const validFiles = files.filter((file) => {
      // Проверка MIME-типа (должен начинаться с "image/")
      if (!file.type.startsWith("image/")) {
        alert(`${file.name}: Пожалуйста, выберите изображение`);
        return false; // Не прошёл проверку - исключаем из массива
      }
      // Проверка размера (5 МБ = 5 * 1024 * 1024 байт)
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name}: Файл слишком большой (максимум 5MB)`);
        return false;
      }
      return true; // Прошёл проверку
    });

    // Добавляем валидные файлы к уже выбранным
    setSelectedFiles((prev) => [...prev, ...validFiles]);

    // Создаём превью для каждого файла через FileReader
    validFiles.forEach((file) => {
      const reader = new FileReader(); // API для чтения файлов
      // Колбэк выполнится когда файл прочитан
      reader.onloadend = () => {
        // reader.result содержит base64 строку (data:image/jpeg;base64,...)
        setPreviewUrls((prev) => [...prev, reader.result as string]);
      };
      // Читаем файл как Data URL (base64)
      reader.readAsDataURL(file);
    });
  };

  // Удаление файла из списка выбранных (по индексу)
  const handleRemoveFile = (index: number) => {
    // filter создаёт новый массив без элемента с указанным индексом
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  // Главный обработчик отправки формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Предотвращаем стандартную отправку формы (перезагрузку страницы)
    setError(""); // Сбрасываем предыдущие сообщения
    setSuccess("");

    // Проверка авторизации - если нет токена, редиректим на логин
    if (!token) {
      setError("Необходимо войти в аккаунт");
      router.push("/login"); // Программный редирект
      return; // Прерываем выполнение функции
    }

    // Валидация координат - преобразуем строки в числа
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    // isNaN проверяет что получилось валидное число (не "abc" или пустая строка)
    if (isNaN(lat) || isNaN(lng)) {
      setError("Некорректные координаты");
      return;
    }

    // Включаем индикатор загрузки
    setIsSubmitting(true);

    try {
      // ═════════════════════════════════════════════════════════════
      // ШАГ 1: Создание места (POST /api/places)
      // ═════════════════════════════════════════════════════════════

      const res = await api.post(
        "/api/places", // Эндпоинт
        {
          // Тело запроса - данные формы
          title: form.title.trim(), // Убираем лишние пробелы
          description: form.description.trim(),
          address: form.address.trim(),
          latitude: lat, // Число, не строка
          longitude: lng, // Число, не строка
          // Условное поле: если выбран тип, отправляем число, иначе undefined
          mushroomTypeId: form.mushroomTypeId
            ? parseInt(form.mushroomTypeId)
            : undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`, // JWT токен для авторизации
          },
        },
      );

      // Получаем созданное место из ответа сервера
      const newPlace = res.data;

      // ═════════════════════════════════════════════════════════════
      // ШАГ 2: Загрузка фотографий (если есть)
      // ═════════════════════════════════════════════════════════════

      if (selectedFiles.length > 0 && newPlace.id) {
        // Последовательная загрузка каждого файла
        for (const file of selectedFiles) {
          const formData = new FormData(); // Объект для multipart/form-data
          formData.append("file", file); // Ключ "file" должен совпадать с бэкендом

          try {
            await api.post(
              `/api/places/${newPlace.id}/images`, // Эндпоинт с ID места
              formData,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "multipart/form-data", // Важно для загрузки файлов
                },
              },
            );
          } catch (err) {
            // Ошибка загрузки одного файла не прерывает весь процесс
            console.error(`Ошибка загрузки ${file.name}:`, err);
          }
        }
      }

      // Успех! Показываем сообщение и редиректим на карту через 2 секунды
      setSuccess("Точка успешно добавлена!");
      setTimeout(() => router.push("/map"), 2000);
    } catch (err: any) {
      // Обработка ошибок API
      // err.response?.data?.message - сообщение от сервера
      // err.message - стандартное сообщение ошибки
      setError(
        err.response?.data?.message || err.message || "Произошла ошибка",
      );
    } finally {
      // В любом случае (успех или ошибка) выключаем индикатор загрузки
      setIsSubmitting(false);
    }
  };

  // ═════════════════════════════════════════════════════════════════
  // JSX РАЗМЕТКА
  // ═════════════════════════════════════════════════════════════════

  return (
    // Контейнер формы - центрирован, ограничен по ширине
    <div className="max-w-2xl mx-auto p-6">
      {/* Заголовок страницы */}
      <h1 className="text-3xl font-bold mb-8 text-center">
        Добавить грибное место 🍄
      </h1>

      {/* Условный рендеринг: показываем ошибку только если error не пустая */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Условный рендеринг: показываем успех только если success не пустая */}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
          {success}
        </div>
      )}

      {/* Форма с обработчиком onSubmit */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ═════════════════════════════════════════════════════════════ */}
        {/* ПОЛЕ: Название места */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Название места *
          </label>
          <input
            name="title" // Ключ для handleChange
            value={form.title} // Контролируемый компонент
            onChange={handleChange} // Обработчик изменения
            required // HTML5 валидация (не пустое)
            disabled={isSubmitting} // Блокировка при отправке
            className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
          />
        </div>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* ПОЛЕ: Тип гриба (select) */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <div>
          <label className="block text-sm font-medium mb-1">Тип гриба</label>
          <select
            name="mushroomTypeId"
            value={form.mushroomTypeId}
            onChange={handleChange}
            disabled={isSubmitting}
            className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
          >
            {/* Опция по умолчанию */}
            <option value="">Выберите тип гриба (не обязательно)</option>
            {/* Динамический список из API */}
            {mushroomTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* ПОЛЕ: Адрес */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Адрес / Район
          </label>
          <input
            name="address"
            value={form.address}
            onChange={handleChange}
            placeholder="Например: Минская область, Минский район"
            disabled={isSubmitting}
            className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
          />
        </div>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* ПОЛЕ: Описание (textarea) */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <div>
          <label className="block text-sm font-medium mb-1">Описание</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={4} // Высота 4 строки
            disabled={isSubmitting}
            className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
          />
        </div>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* ПОЛЯ: Координаты (в сетке 2 колонки) */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Широта */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Широта (latitude) *
            </label>
            <input
              name="latitude"
              type="number" // Числовой ввод
              step="any" // Дробные числа разрешены
              value={form.latitude}
              onChange={handleChange}
              required
              disabled={isSubmitting}
              className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
            />
          </div>

          {/* Долгота */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Долгота (longitude) *
            </label>
            <input
              name="longitude"
              type="number"
              step="any"
              value={form.longitude}
              onChange={handleChange}
              required
              disabled={isSubmitting}
              className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
            />
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* ПОЛЕ: Загрузка фотографий */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Фотографии ({selectedFiles.length} выбрано)
          </label>
          {/* input type="file" скрыт стилями, отображается как кнопка */}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp" // Разрешённые форматы
            onChange={handleFileChange}
            multiple // Разрешаем выбор нескольких файлов
            disabled={isSubmitting}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="text-xs text-gray-400 mt-1">JPG, PNG до 5MB каждый</p>

          {/* Превью выбранных файлов */}
          {previewUrls.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mt-3">
              {previewUrls.map((url, index) => (
                <div key={index} className="relative">
                  {/* Изображение превью */}
                  <img
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-20 object-cover rounded"
                  />
                  {/* Кнопка удаления */}
                  <button
                    type="button" // type="button" чтобы не отправить форму
                    onClick={() => handleRemoveFile(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs hover:bg-red-600"
                    disabled={isSubmitting}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* КНОПКА ОТПРАВКИ */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <button
          type="submit"
          // Блокировка: идёт отправка ИЛИ не заполнены обязательные поля
          disabled={
            isSubmitting || !form.title || !form.latitude || !form.longitude
          }
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors"
        >
          {/* Текст меняется в зависимости от состояния */}
          {isSubmitting ? "⏳ Сохранение..." : "Добавить точку на карту"}
        </button>
      </form>
    </div>
  );
}
