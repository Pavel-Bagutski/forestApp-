package by.forestapp.stepOne.controller;

import by.forestapp.stepOne.model.MushroomPlace;
import by.forestapp.stepOne.model.PlaceImage;
import by.forestapp.stepOne.repository.MushroomPlaceRepository;
import by.forestapp.stepOne.repository.PlaceImageRepository;
import by.forestapp.stepOne.service.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * ============================================================================
 * КОНТРОЛЛЕР МЕСТ С ГРИБАМИ
 * ============================================================================
 *
 * "ЧТО ЭТО": REST API для управления местами и их фотографиями
 * "С ЧЕМ ВЗАИМОДЕЙСТВУЕТ":
 *   - С базой данных (MushroomPlaceRepository, PlaceImageRepository)
 *   - С хранилищем файлов (StorageService - Supabase S3)
 *   - С Spring Security (Authentication)
 *
 * "НА ЧТО ВЛИЯЕТ":
 *   - Создание, чтение, обновление, удаление мест
 *   - Загрузка фотографий (одиночная и пакетная)
 *   - Проверка прав доступа (владелец места)
 */
@RestController
@RequestMapping("/api/places")
@RequiredArgsConstructor
public class PlacesController {

    private final MushroomPlaceRepository placeRepository;
    private final PlaceImageRepository placeImageRepository;
    private final StorageService storageService;

    // ==========================================
    // МЕТОД 1: Загрузка одного изображения (существующий)
    // ==========================================

    /**
     * "ЧТО ДЕЛАЕТ": Загружает одно фото к существующему месту
     * "КУДА ОТПРАВЛЯЕТСЯ": В Supabase Storage, затем URL в БД
     * "НА ЧТО ВЛИЯЕТ": Добавляет запись в таблицу place_images
     *
     * Аналогия: как прикрепить один файл к письму
     */
    @PostMapping(value = "/{id}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @Transactional
    public ResponseEntity<?> uploadImage(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {

        // 1. Находим место
        MushroomPlace place = placeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Место не найдено"));

        // 2. Проверяем владельца (ИСПРАВЛЕНО: getOwner() вместо getUser())
        if (!place.getOwner().getEmail().equals(authentication.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Вы не владелец этого места"));
        }

        try {
            // 3. Загружаем файл в хранилище
            String imageUrl = storageService.uploadImage(file, id);

            // 4. Сохраняем метаданные в БД
            PlaceImage placeImage = PlaceImage.builder()
                    .url(imageUrl)
                    .place(place)
                    .uploadedAt(LocalDateTime.now())
                    .build();

            placeImageRepository.save(placeImage);

            // 5. Возвращаем результат
            return ResponseEntity.ok(Map.of(
                    "id", placeImage.getId(),
                    "url", imageUrl,
                    "message", "Фото загружено"
            ));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Ошибка загрузки: " + e.getMessage()));
        }
    }

    // ==========================================
    // МЕТОД 2: Пакетная загрузка (НОВЫЙ)
    // ==========================================

    /**
     * "ЧТО ДЕЛАЕТ": Загружает несколько фото одним запросом
     * "ЗАЧЕМ": Оптимизация - меньше HTTP-запросов от фронтенда
     * "ОГРАНИЧЕНИЯ": Максимум 10 файлов, каждый до 5MB
     *
     * Аналогия: как прикрепить несколько файлов к письму сразу
     */
    @PostMapping(value = "/{id}/images/batch", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @Transactional
    public ResponseEntity<?> uploadImagesBatch(
            @PathVariable Long id,
            @RequestParam("files") List<MultipartFile> files,
            Authentication authentication) {

        // 1. Валидация входных данных
        if (files == null || files.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Не выбраны файлы"));
        }

        if (files.size() > 10) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Максимум 10 файлов за раз"));
        }

        // 2. Находим место и проверяем права
        MushroomPlace place = placeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Место не найдено"));

        if (!place.getOwner().getEmail().equals(authentication.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Вы не владелец этого места"));
        }

        // 3. Проверяем лимит фото (ИСПРАВЛЕНО: countByPlaceId)
        long existingCount = placeImageRepository.countByPlaceId(id);
        if (existingCount + files.size() > 10) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error",
                            String.format("Превышен лимит фото. Уже есть: %d, пытаетесь добавить: %d (макс. 10)",
                                    existingCount, files.size())));
        }

        // 4. Обработка каждого файла
        List<Map<String, Object>> results = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        for (int i = 0; i < files.size(); i++) {
            MultipartFile file = files.get(i);

            try {
                // Валидация файла
                if (file.isEmpty()) {
                    errors.add(String.format("Файл %d: пустой", i + 1));
                    continue;
                }

                if (file.getSize() > 5 * 1024 * 1024) {
                    errors.add(String.format("Файл '%s': превышает 5MB",
                            file.getOriginalFilename()));
                    continue;
                }

                // Загрузка в хранилище
                String imageUrl = storageService.uploadImage(file, id);

                // Сохранение в БД
                PlaceImage placeImage = PlaceImage.builder()
                        .url(imageUrl)
                        .place(place)
                        .uploadedAt(LocalDateTime.now())
                        .build();

                placeImageRepository.save(placeImage);

                // Успешный результат
                Map<String, Object> result = new HashMap<>();
                result.put("id", placeImage.getId());
                result.put("url", imageUrl);
                result.put("filename", file.getOriginalFilename());
                result.put("index", i);
                results.add(result);

            } catch (Exception e) {
                errors.add(String.format("'%s': %s",
                        file.getOriginalFilename(), e.getMessage()));
            }
        }

        // 5. Формирование ответа
        Map<String, Object> response = new HashMap<>();
        response.put("success", results.size());
        response.put("failed", errors.size());
        response.put("total", files.size());
        response.put("images", results);
        response.put("errors", errors);

        // Если ничего не загрузилось - ошибка
        if (results.isEmpty()) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(response);
        }

        // Частичный успех или полный успех
        return ResponseEntity.ok(response);
    }

    // ==========================================
    // МЕТОД 3: Временная загрузка (НОВЫЙ, опционально)
    // ==========================================

    /**
     * "ЧТО ДЕЛАЕТ": Загружает фото без привязки к месту (во временную папку)
     * "ЗАЧЕМ": Для сценария "сначала загрузим фото, потом создадим место"
     * "ВАЖНО": Требует доработки (периодическая очистка temp)
     *
     * Аналогия: как оставить вещи в камере хранения на вокзале
     */
    @PostMapping(value = "/images/temp", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<?> uploadTempImage(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {

        try {
            // ИСПРАВЛЕНО: используем uploadTempImage из StorageService
            String imageUrl = storageService.uploadTempImage(file);

            return ResponseEntity.ok(Map.of(
                    "url", imageUrl,
                    "tempId", System.currentTimeMillis(),
                    "message", "Временное фото загружено"
            ));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Ошибка загрузки: " + e.getMessage()));
        }
    }

    // ==========================================
    // ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ (при необходимости)
    // ==========================================

    /**
     * Получение всех фото места
     */
    @GetMapping("/{id}/images")
    public ResponseEntity<?> getPlaceImages(@PathVariable Long id) {
        MushroomPlace place = placeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Место не найдено"));

        List<PlaceImage> images = placeImageRepository.findByPlaceId(id);

        List<Map<String, Object>> result = images.stream()
                .map(img -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", img.getId());
                    map.put("url", img.getUrl());
                    map.put("uploadedAt", img.getUploadedAt());
                    return map;
                })
                .toList();

        return ResponseEntity.ok(Map.of(
                "placeId", id,
                "count", result.size(),
                "images", result
        ));
    }

    /**
     * Удаление фото
     */
    @DeleteMapping("/{placeId}/images/{imageId}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @Transactional
    public ResponseEntity<?> deleteImage(
            @PathVariable Long placeId,
            @PathVariable Long imageId,
            Authentication authentication) {

        MushroomPlace place = placeRepository.findById(placeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Место не найдено"));

        if (!place.getOwner().getEmail().equals(authentication.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Вы не владелец этого места"));
        }

        PlaceImage image = placeImageRepository.findById(imageId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Фото не найдено"));

        // TODO: удалить из хранилища (StorageService.deleteImage)

        placeImageRepository.delete(image);

        return ResponseEntity.ok(Map.of("message", "Фото удалено"));
    }
}