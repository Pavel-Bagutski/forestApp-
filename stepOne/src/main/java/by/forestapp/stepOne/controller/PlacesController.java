package by.forestapp.stepOne.controller;

import by.forestapp.stepOne.model.MushroomPlace;
import by.forestapp.stepOne.model.PlaceImage;
import by.forestapp.stepOne.model.User;
import by.forestapp.stepOne.repository.MushroomPlaceRepository;
import by.forestapp.stepOne.repository.PlaceImageRepository;
import by.forestapp.stepOne.repository.UserRepository;
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

@RestController
@RequestMapping("/api/places")
@RequiredArgsConstructor
public class PlacesController {

    private final MushroomPlaceRepository placeRepository;
    private final PlaceImageRepository placeImageRepository;
    private final StorageService storageService;
    private final UserRepository userRepository; // 🆕 Добавить

    // ==========================================
    // 🆕 CRUD МЕТОДЫ ДЛЯ МЕСТ (БЫЛИ ПРОПУЩЕНЫ!)
    // ==========================================

    /**
     * Получить все места (ПУБЛИЧНЫЙ)
     */
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllPlaces() {
        List<MushroomPlace> places = placeRepository.findAllWithImages();

        List<Map<String, Object>> result = places.stream()
                .map(this::convertToMap)
                .toList();

        return ResponseEntity.ok(result);
    }

    /**
     * Получить место по ID (ПУБЛИЧНЫЙ)
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getPlaceById(@PathVariable Long id) {
        MushroomPlace place = placeRepository.findByIdWithImages(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Место не найдено"));

        return ResponseEntity.ok(convertToMap(place));
    }

    /**
     * Создать место (ТРЕБУЕТ АВТОРИЗАЦИИ)
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @Transactional
    public ResponseEntity<?> createPlace(
            @RequestBody Map<String, Object> placeData,
            Authentication authentication) {

        // Находим пользователя
        User owner = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Пользователь не найден"));

        // Создаем место
        MushroomPlace place = MushroomPlace.builder()
                .title((String) placeData.get("title"))
                .description((String) placeData.get("description"))
                .latitude(((Number) placeData.get("latitude")).doubleValue())
                .longitude(((Number) placeData.get("longitude")).doubleValue())
                .address((String) placeData.get("address"))
                .owner(owner)
                .build();

        MushroomPlace saved = placeRepository.save(place);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(convertToMap(saved));
    }

    /**
     * Обновить место (ТРЕБУЕТ АВТОРИЗАЦИИ + ВЛАДЕЛЬЦА)
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @Transactional
    public ResponseEntity<?> updatePlace(
            @PathVariable Long id,
            @RequestBody Map<String, Object> placeData,
            Authentication authentication) {

        MushroomPlace place = placeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Место не найдено"));

        // Проверка владельца
        if (!place.getOwner().getEmail().equals(authentication.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Вы не владелец этого места"));
        }

        // Обновляем поля
        if (placeData.containsKey("title")) {
            place.setTitle((String) placeData.get("title"));
        }
        if (placeData.containsKey("description")) {
            place.setDescription((String) placeData.get("description"));
        }
        if (placeData.containsKey("latitude")) {
            place.setLatitude(((Number) placeData.get("latitude")).doubleValue());
        }
        if (placeData.containsKey("longitude")) {
            place.setLongitude(((Number) placeData.get("longitude")).doubleValue());
        }
        if (placeData.containsKey("address")) {
            place.setAddress((String) placeData.get("address"));
        }

        MushroomPlace updated = placeRepository.save(place);

        return ResponseEntity.ok(convertToMap(updated));
    }

    /**
     * Удалить место (ТРЕБУЕТ АВТОРИЗАЦИИ + ВЛАДЕЛЬЦА)
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @Transactional
    public ResponseEntity<?> deletePlace(
            @PathVariable Long id,
            Authentication authentication) {

        MushroomPlace place = placeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Место не найдено"));

        // Проверка владельца
        if (!place.getOwner().getEmail().equals(authentication.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Вы не владелец этого места"));
        }

        placeRepository.delete(place);

        return ResponseEntity.ok(Map.of("message", "Место удалено"));
    }

    // ==========================================
    // ВСПОМОГАТЕЛЬНЫЙ МЕТОД КОНВЕРТАЦИИ
    // ==========================================

    private Map<String, Object> convertToMap(MushroomPlace place) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", place.getId());
        map.put("title", place.getTitle());
        map.put("description", place.getDescription());
        map.put("latitude", place.getLatitude());
        map.put("longitude", place.getLongitude());
        map.put("address", place.getAddress());
        map.put("createdAt", place.getCreatedAt());
        map.put("updatedAt", place.getUpdatedAt());

        // Владелец
        Map<String, Object> ownerMap = new HashMap<>();
        ownerMap.put("id", place.getOwner().getId());
        ownerMap.put("email", place.getOwner().getEmail());
        ownerMap.put("username", place.getOwner().getUsername());
        map.put("owner", ownerMap);

        // Изображения
        List<Map<String, Object>> images = place.getImages().stream()
                .map(img -> {
                    Map<String, Object> imgMap = new HashMap<>();
                    imgMap.put("id", img.getId());
                    imgMap.put("url", img.getUrl());
                    imgMap.put("uploadedAt", img.getUploadedAt());
                    return imgMap;
                })
                .toList();
        map.put("images", images);
        map.put("imageCount", images.size());

        // Типы грибов
        List<Map<String, Object>> mushroomTypes = place.getMushroomTypes().stream()
                .map(mt -> {
                    Map<String, Object> mtMap = new HashMap<>();
                    mtMap.put("id", mt.getId());
                    mtMap.put("name", mt.getName());
                    mtMap.put("category", mt.getCategory());
                    return mtMap;
                })
                .toList();
        map.put("mushroomTypes", mushroomTypes);

        return map;
    }

    // ==========================================
    // ЗАГРУЗКА ФОТОГРАФИЙ
    // ==========================================

    /**
     * Загрузить одно фото к месту
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

        // 2. Проверяем владельца
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
}