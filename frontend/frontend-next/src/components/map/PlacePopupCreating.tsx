/**
 * =============================================================================
// ==========================================
// СТРОКА 1: "use client"
// ==========================================

/**
 * "ЧТО ЭТО": Директива Next.js
 * "НА ЧТО ВЛИЯЕТ": Код выполняется только в браузере, не на сервере
 * 
 * Аналогия: как пометка "Только для внутреннего использования" -
 * сервер не трогает, браузер обрабатывает
 */
"use client";

// ==========================================
// ИМПОРТЫ (строки 3-6)
// ==========================================

import { useState, useEffect, memo, useRef } from "react"; // React хуки
import { motion } from "framer-motion"; // Анимации
import { X, MapPin, Plus, Upload, Trash2, ChevronDown, X as XIcon } from "lucide-react"; // Иконки
import { useAuthStore } from "@/store/authStore"; // Авторизация
import type { MushroomType, EdibilityCategory } from "@/api/mushroomTypeApi";

/**
 * useState    - хранение данных формы (название, описание)
 * useEffect   - побочные эффекты (ESC, сброс формы)
 * memo        - оптимизация (не перерисовывать без изменений пропсов)
 * motion      - анимированные блоки (появление/исчезновение)
 * useAuthStore - проверка: вошёл ли пользователь (token)
 */

// ==========================================
// ИНТЕРФЕЙС (строки 10-20)
// ============================================

/**
 * "ЧТО ЭТО": Контракт входных данных
 * "С ЧЕМ ВЗАИМОДЕЙСТВУЕТ": С TypeScript для проверки типов
 *
 * Аналогия: бланк заявления на добавление места
 * - Обязательные поля отмечены (без ?)
 * - Опциональные имеют ?
 */
interface NewPlacePopupProps {
  lat: number; // Широта (обязательно)
  lng: number; // Долгота (обязательно)
  isOpen: boolean; // Открыто ли окно (обязательно)
  onClose: () => void; // Как закрыть (обязательно)
  mushroomTypes: MushroomType[]; // Доступные типы грибов
  onSubmit: (data: {
    // Как сохранить (обязательно)
    title: string;
    description: string;
    latitude: number;
    longitude: number;
    images: File[];
    mushroomTypeIds: number[]; // ID выбранных грибов
    newMushroomTypes: { name: string; category?: EdibilityCategory }[]; // Новые грибы
  }) => void;
}

// ==========================================
// КОМПОНЕНТ (строка 24)
// ==========================================

/**
 * "ЧТО ЭТО": Модальное окно создания новой точки на карте
 * "С ЧЕМ ВЗАИМОДЕЙСТВУЕТ":
 *   - С Map (получает координаты, отправляет данные формы)
 *   - С authStore (проверяет авторизацию)
 *   - С пользователем (ввод данных, клики)
 *
 * "КУДА ОТПРАВЛЯЕТСЯ":
 *   - Данные формы в Map через onSubmit
 *   - Сигнал закрытия в Map через onClose
 *
 * "НА ЧТО ВЛИЯЕТ":
 *   - Создание новых мест на карте
 *   - UX: анимации, валидация, доступность
 */
export const NewPlacePopup = memo(function NewPlacePopup({
  lat, // ← Широта точки (от Map)
  lng, // ← Долгота точки (от Map)
  isOpen, // ← Флаг видимости (от Map)
  onClose, // ← Функция закрытия (от Map)
  mushroomTypes, // ← Доступные типы грибов
  onSubmit, // ← Функция сохранения (от Map)
}: NewPlacePopupProps) {
  // ==========================================
  // СОСТОЯНИЕ (строки 25-26)
  // ==========================================

  const { token } = useAuthStore(); // ← JWT токен (null если не авторизован)

  const [title, setTitle] = useState(""); // ← Название места
  const [description, setDescription] = useState(""); // ← Описание места
  const [selectedImages, setSelectedImages] = useState<File[]>([]); // ← Выбранные фото
  const [previews, setPreviews] = useState<string[]>([]); // ← Превью фото
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Состояние для грибов
  const [selectedMushroomIds, setSelectedMushroomIds] = useState<number[]>([]); // Выбранные ID
  const [newMushrooms, setNewMushrooms] = useState<{ name: string; category?: EdibilityCategory }[]>([]); // Новые грибы
  const [isMushroomDropdownOpen, setIsMushroomDropdownOpen] = useState(false);
  const [newMushroomInput, setNewMushroomInput] = useState("");
  const [newMushroomCategory, setNewMushroomCategory] = useState<EdibilityCategory>("EDIBLE");
  const mushroomDropdownRef = useRef<HTMLDivElement>(null);

  /**
   * Аналогия: как чистый бланк заявления
   * - title = поле "ФИО" (пока пустое)
   * - description = поле "Примечание" (пока пустое)
   * - setTitle = ручка для заполнения поля "ФИО"
   */

  // ==========================================
  // ЭФФЕКТ 1: Сброс формы (строки 29-34)
  // ==========================================

  /**
   * "ЧТО ДЕЛАЕТ": Очищает поля при открытии окна
   * "ЗАЧЕМ": Чтобы не показывать старые данные при повторном открытии
   *
   * Аналогия: как уборщица, которая протирает стол перед новым клиентом
   */
  useEffect(() => {
    if (isOpen) {
      // ← Если окно только что открылось
      setTitle(""); // ← Стираем название
      setDescription(""); // ← Стираем описание
      setSelectedImages([]); // ← Стираем выбранные фото
      setPreviews([]); // ← Стираем превью
      setSelectedMushroomIds([]); // ← Стираем выбранные грибы
      setNewMushrooms([]); // ← Стираем новые грибы
      setIsMushroomDropdownOpen(false);
      setNewMushroomInput("");
    }
  }, [isOpen]); // ← Следим за isOpen (выполняется при изменении)
  
  // Закрытие dropdown при клике вне
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mushroomDropdownRef.current && !mushroomDropdownRef.current.contains(e.target as Node)) {
        setIsMushroomDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ==========================================
  // ЭФФЕКТ 2: Закрытие по ESC (строки 37-45)
  // ==========================================

  /**
   * "ЧТО ДЕЛАЕТ": Закрывает окно при нажатии клавиши Escape
   * "ЗАЧЕМ": Стандарт доступности (UX), быстрое закрытие
   *
   * Аналогия: как кнопка "Выход" на пульте - работает отовсюду
   */
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        // ← Нажали ESC и окно открыто
        onClose(); // ← Закрываем!
      }
    };

    window.addEventListener("keydown", handleEsc); // ← Подписались
    return () => window.removeEventListener("keydown", handleEsc); // ← Отписались
  }, [isOpen, onClose]); // ← Зависимости: пересоздаём если они изменятся

  // ==========================================
  // ОБРАБОТЧИК ОТПРАВКИ (строки 47-58)
  // ==========================================

  /**
   * "ЧТО ДЕЛАЕТ": Проверяет и отправляет данные
   * "КУДА": В Map через onSubmit callback
   *
   * Аналогия: как проверка документов перед подачей заявления
   */
  const handleSubmit = () => {
    if (!title.trim()) return; // ← Валидация: название обязательно!

    onSubmit({
      // ← Отправляем данные в Map!
      title: title.trim(), // ← Название (без пробелов по краям)
      description: description.trim(), // ← Описание
      latitude: lat, // ← Широта (из пропсов)
      longitude: lng, // ← Долгота (из пропсов)
      images: selectedImages, // ← Выбранные фото
      mushroomTypeIds: selectedMushroomIds, // ← ID выбранных грибов
      newMushroomTypes: newMushrooms, // ← Новые грибы
    });

    onClose(); // ← Закрываем окно после отправки
  };
  
  // ==========================================
  // ОБРАБОТЧИКИ ГРИБОВ
  // ==========================================
  
  const toggleMushroomType = (typeId: number) => {
    setSelectedMushroomIds(prev => 
      prev.includes(typeId) 
        ? prev.filter(id => id !== typeId)
        : [...prev, typeId]
    );
  };
  
  const removeSelectedMushroom = (typeId: number) => {
    setSelectedMushroomIds(prev => prev.filter(id => id !== typeId));
  };
  
  const addNewMushroom = () => {
    const trimmedName = newMushroomInput.trim();
    if (!trimmedName) return;
    
    // Проверяем, нет ли уже такого гриба в новых
    if (newMushrooms.some(m => m.name.toLowerCase() === trimmedName.toLowerCase())) {
      setNewMushroomInput("");
      return;
    }
    
    setNewMushrooms(prev => [...prev, { name: trimmedName, category: newMushroomCategory }]);
    setNewMushroomInput("");
  };
  
  const removeNewMushroom = (index: number) => {
    setNewMushrooms(prev => prev.filter((_, i) => i !== index));
  };
  
  const getCategoryColor = (category?: EdibilityCategory) => {
    switch (category) {
      case "EDIBLE": return "bg-green-100 text-green-800 border-green-300";
      case "CONDITIONALLY_EDIBLE": return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "POISONOUS": return "bg-red-100 text-red-800 border-red-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };
  
  const getCategoryIcon = (category?: EdibilityCategory) => {
    switch (category) {
      case "EDIBLE": return "✅";
      case "CONDITIONALLY_EDIBLE": return "⚠️";
      case "POISONOUS": return "☠️";
      default: return "❓";
    }
  };

  // ==========================================
  // ОБРАБОТЧИКИ ЗАГРУЗКИ ФОТО
  // ==========================================
  
  const MAX_IMAGES = 10;
  const canAddMoreImages = selectedImages.length < MAX_IMAGES;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith("image/"));
    const validFiles = imageFiles.filter(file => file.size <= 5 * 1024 * 1024);
    
    if (validFiles.length !== files.length) {
      alert("Некоторые файлы пропущены: только изображения до 5MB");
    }

    const remainingSlots = MAX_IMAGES - selectedImages.length;
    const filesToAdd = validFiles.slice(0, remainingSlots);

    if (filesToAdd.length > 0) {
      setSelectedImages(prev => [...prev, ...filesToAdd]);
      
      // Создаем превью для новых файлов
      filesToAdd.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFiles(files);
    }
    // Сбрасываем input чтобы можно было выбрать те же файлы снова
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // ==========================================
  // РАННИЙ ВЫХОД (строка 60)
  // ==========================================

  if (!isOpen) return null; // ← Если окно закрыто - ничего не рендерим

  /**
   * Аналогия: как "Закрыто" на двери магазина -
   * заходить незачем, уходим
   */

  // ==========================================
  // ВЕТВЛЕНИЕ: Неавторизован (строки 63-108)
  // ==========================================

  /**
   * "ЧТО ЭТО": Экран "Войдите в систему"
   * "ЗАЧЕМ": Защита - только авторизованные добавляют места
   *
   * Аналогия: как охранник на входе: "Пропуска нет - прохода нет"
   */
  if (!token) {
    // ← Нет токена = не вошли
    return (
      <>
        {/* Оверлей (затемнение фона) */}
        <motion.div
          initial={{ opacity: 0 }} // ← Начало: прозрачный
          animate={{ opacity: 1 }} // ← Конец: видимый
          exit={{ opacity: 0 }} // ← Уход: прозрачный
          className="fixed inset-0 bg-black/30 z-40" // ← На весь экран, затемнение
          onClick={onClose} // ← Клик по фону = закрыть
        />

        {/* Сам попап */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }} // ← Маленький и ниже
          animate={{ opacity: 1, scale: 1, y: 0 }} // ← Нормальный размер
          exit={{ opacity: 0, scale: 0.9, y: 20 }} // ← Уменьшается и падает
          transition={{ type: "spring", damping: 25, stiffness: 300 }} // ← Пружина
          className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
        >
          <div
            className="w-full max-w-[350px] bg-white rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
            onClick={(e) => e.stopPropagation()} // ← Клик внутри не закрывает
          >
            <div className="p-6 text-center">
              {/* Шапка с крестиком */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🔒</span>
                  <h3 className="font-bold text-lg text-gray-900">
                    Требуется вход
                  </h3>
                </div>
                <button onClick={onClose} className="...">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="text-5xl mb-4">🔒</div>

              <p className="text-gray-600 mb-6">
                Войдите в систему, чтобы добавлять новые места на карту
              </p>

              {/* Кнопка на страницу входа */}
              <a
                href="/login"
                className="block w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700"
              >
                Войти
              </a>
            </div>
          </div>
        </motion.div>
      </>
    );
  }

  // ==========================================
  // ОСНОВНАЯ ФОРМА (строки 110-184) - для авторизованных
  // ==========================================

  return (
    <>
      {/* Оверлей (тот же, что и выше) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Попап с формой */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="w-full max-w-[350px] max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 space-y-4 overflow-y-auto max-h-[85vh]">
            {/* ШАПКА (строки 136-149) */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-2xl flex-shrink-0">🍄</span>
                <h3 className="font-bold text-lg text-gray-900 truncate">
                  Новое место
                </h3>
              </div>
              <button onClick={onClose} className="...">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* КООРДИНАТЫ (строки 152-158) */}
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-gray-400" />
              <code className="text-gray-600 font-mono text-xs">
                {Math.abs(lat).toFixed(4)}° {lat >= 0 ? "N" : "S"},{" "}
                {Math.abs(lng).toFixed(4)}° {lng >= 0 ? "E" : "W"}
              </code>
            </div>
            {/* Показываем: 53.9045° N, 27.5615° E */}

            {/* ФОРМА (строки 161-180) */}
            <div className="space-y-3">
              {/* Поле НАЗВАНИЕ */}
              <div>
                <label className="text-xs text-gray-500 uppercase font-semibold block mb-1">
                  Название *
                </label>
                <input
                  type="text"
                  placeholder="Например: Боровиковая поляна"
                  value={title} // ← Привязка к state
                  onChange={(e) => setTitle(e.target.value)} // ← Обновление state
                  className="w-full p-2.5 border border-gray-200 rounded-lg ..."
                  autoFocus // ← Автофокус при открытии
                />
              </div>

              {/* Поле ОПИСАНИЕ */}
              <div>
                <label className="text-xs text-gray-500 uppercase font-semibold block mb-1">
                  Описание
                </label>
                <textarea
                  placeholder="Опишите место, как добраться..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 border border-gray-200 rounded-lg resize-none ..."
                />
              </div>

              {/* ЗАГРУЗКА ФОТО */}
              <div>
                <label className="text-xs text-gray-500 uppercase font-semibold block mb-2">
                  Фотографии ({selectedImages.length}/{MAX_IMAGES})
                </label>
                
                {/* Сетка превью */}
                {previews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {previews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-16 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                          type="button"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Dropzone */}
                {canAddMoreImages && (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                      flex flex-col items-center justify-center gap-1 py-3 px-4 
                      border-2 border-dashed rounded-lg cursor-pointer transition-all
                      ${isDragging ? "border-green-500 bg-green-50" : "border-gray-300 hover:border-green-400 bg-gray-50/50"}
                    `}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleFileInputChange}
                    />
                    <Upload
                      className={`w-5 h-5 ${isDragging ? "text-green-500" : "text-gray-400"}`}
                    />
                    <span className="text-xs text-gray-500 text-center">
                      {isDragging ? "Отпустите файлы" : "Перетащите или нажмите"}
                    </span>
                    <span className="text-[10px] text-gray-400">JPG, PNG до 5MB</span>
                  </div>
                )}
              </div>

              {/* ВЫБОР ГРИБОВ */}
              <div>
                <label className="text-xs text-gray-500 uppercase font-semibold block mb-2">
                  Грибы
                </label>
                
                {/* Выбранные грибы (чипсы) */}
                {(selectedMushroomIds.length > 0 || newMushrooms.length > 0) && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {/* Существующие грибы */}
                    {selectedMushroomIds.map(typeId => {
                      const type = mushroomTypes.find(t => t.id === typeId);
                      if (!type) return null;
                      return (
                        <span
                          key={type.id}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${getCategoryColor(type.category)}`}
                        >
                          {getCategoryIcon(type.category)} {type.name}
                          <button
                            onClick={() => removeSelectedMushroom(type.id)}
                            className="ml-0.5 hover:bg-black/10 rounded-full p-0.5"
                            type="button"
                          >
                            <XIcon className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                    {/* Новые грибы */}
                    {newMushrooms.map((mushroom, index) => (
                      <span
                        key={`new-${index}`}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${getCategoryColor(mushroom.category)}`}
                      >
                        {getCategoryIcon(mushroom.category)} {mushroom.name}
                        <span className="text-[10px] opacity-60">(новый)</span>
                        <button
                          onClick={() => removeNewMushroom(index)}
                          className="ml-0.5 hover:bg-black/10 rounded-full p-0.5"
                          type="button"
                        >
                          <XIcon className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Dropdown для выбора грибов */}
                <div className="relative" ref={mushroomDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsMushroomDropdownOpen(!isMushroomDropdownOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm text-gray-600">
                      {selectedMushroomIds.length + newMushrooms.length > 0 
                        ? `Выбрано: ${selectedMushroomIds.length + newMushrooms.length}` 
                        : "Выберите грибы..."}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isMushroomDropdownOpen ? "rotate-180" : ""}`} />
                  </button>
                  
                  {isMushroomDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {/* Поиск/добавление нового гриба */}
                      <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Добавить свой гриб..."
                            value={newMushroomInput}
                            onChange={(e) => setNewMushroomInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addNewMushroom();
                              }
                            }}
                            className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:border-green-500"
                          />
                          <select
                            value={newMushroomCategory}
                            onChange={(e) => setNewMushroomCategory(e.target.value as EdibilityCategory)}
                            className="px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:border-green-500"
                            title="Категория съедобности"
                          >
                            <option value="EDIBLE">✅ Съедобный</option>
                            <option value="CONDITIONALLY_EDIBLE">⚠️ Условно</option>
                            <option value="POISONOUS">☠️ Ядовитый</option>
                          </select>
                          <button
                            type="button"
                            onClick={addNewMushroom}
                            disabled={!newMushroomInput.trim()}
                            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Список существующих грибов */}
                      {mushroomTypes.length === 0 ? (
                        <div className="p-3 text-sm text-gray-500 text-center">
                          Загрузка...
                        </div>
                      ) : (
                        <div className="py-1">
                          {mushroomTypes.map(type => (
                            <button
                              key={type.id}
                              type="button"
                              onClick={() => toggleMushroomType(type.id)}
                              className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-gray-50 transition-colors ${
                                selectedMushroomIds.includes(type.id) ? "bg-green-50" : ""
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span>{getCategoryIcon(type.category)}</span>
                                <span className="text-sm">{type.name}</span>
                                {type.latinName && (
                                  <span className="text-xs text-gray-400 italic">({type.latinName})</span>
                                )}
                              </div>
                              {selectedMushroomIds.includes(type.id) && (
                                <span className="text-green-600 text-sm">✓</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* КНОПКИ */}
            <div className="flex gap-2 pt-2">
              {/* Отмена - меньше и уже */}
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-sm"
              >
                Отмена
              </button>

              {/* Добавить - основная кнопка */}
              <button
                onClick={handleSubmit}
                disabled={!title.trim()}
                className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Добавить
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
});

export default NewPlacePopup;
