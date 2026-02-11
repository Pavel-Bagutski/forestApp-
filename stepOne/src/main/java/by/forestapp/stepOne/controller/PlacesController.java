package by.forestapp.stepOne.controller;

import by.forestapp.stepOne.model.MushroomPlace;
import by.forestapp.stepOne.model.MushroomType;
import by.forestapp.stepOne.model.User;
import by.forestapp.stepOne.repository.MushroomPlaceRepository;
import by.forestapp.stepOne.repository.MushroomTypeRepository;
import by.forestapp.stepOne.service.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/places")
@RequiredArgsConstructor
public class PlacesController {

    private final MushroomPlaceRepository placeRepository;
    private final MushroomTypeRepository mushroomTypeRepository;
    private final StorageService storageService;

    // DTO
    // ============================================
    public static class MushroomPlaceRequest {
        private String title;
        private String description;
        private Double latitude;
        private Double longitude;
        private String address;
        private String imageUrl;
        private Long mushroomTypeId;

        // Getters and Setters
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public Double getLatitude() { return latitude; }
        public void setLatitude(Double latitude) { this.latitude = latitude; }
        public Double getLongitude() { return longitude; }
        public void setLongitude(Double longitude) { this.longitude = longitude; }
        public String getAddress() { return address; }
        public void setAddress(String address) { this.address = address; }
        public String getImageUrl() { return imageUrl; }
        public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
        public Long getMushroomTypeId() { return mushroomTypeId; }
        public void setMushroomTypeId(Long mushroomTypeId) { this.mushroomTypeId = mushroomTypeId; }
    }

    // ============================================
    // CRUD ENDPOINTS
    // ============================================

    @GetMapping
    public List<MushroomPlaceResponse> getAllPlaces() {
        return placeRepository.findAll().stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MushroomPlaceResponse> getPlace(@PathVariable Long id) {
        return placeRepository.findById(id)
                .map(this::convertToResponse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<MushroomPlaceResponse> createPlace(
            @RequestBody MushroomPlaceRequest request,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();

        MushroomType mushroomType = null;
        if (request.getMushroomTypeId() != null) {
            mushroomType = mushroomTypeRepository.findById(request.getMushroomTypeId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Тип гриба не найден"));
        }

        MushroomPlace place = MushroomPlace.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .address(request.getAddress())
                .imageUrl(request.getImageUrl())
                .mushroomType(mushroomType)
                .owner(user)
                .build();

        MushroomPlace saved = placeRepository.save(place);
        return ResponseEntity.status(HttpStatus.CREATED).body(convertToResponse(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MushroomPlaceResponse> updatePlace(
            @PathVariable Long id,
            @RequestBody MushroomPlaceRequest request,
            Authentication authentication) {

        MushroomPlace place = placeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Место не найдено"));

        User user = (User) authentication.getPrincipal();
        if (!place.getOwner().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Нет прав на редактирование");
        }

        if (request.getMushroomTypeId() != null) {
            MushroomType type = mushroomTypeRepository.findById(request.getMushroomTypeId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Тип гриба не найден"));
            place.setMushroomType(type);
        } else {
            place.setMushroomType(null);
        }

        place.setTitle(request.getTitle());
        place.setDescription(request.getDescription());
        place.setLatitude(request.getLatitude());
        place.setLongitude(request.getLongitude());
        place.setAddress(request.getAddress());
        place.setImageUrl(request.getImageUrl());

        return ResponseEntity.ok(convertToResponse(placeRepository.save(place)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePlace(@PathVariable Long id, Authentication authentication) {
        MushroomPlace place = placeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Место не найдено"));

        User user = (User) authentication.getPrincipal();
        if (!place.getOwner().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Нет прав на удаление");
        }

        placeRepository.delete(place);
        return ResponseEntity.noContent().build();
    }

    // ============================================
    // IMAGE UPLOAD ENDPOINT
    // ============================================

    @PostMapping("/{id}/images")
    public ResponseEntity<?> uploadImage(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {

        log.info("Upload request for place {} from user {}", id, authentication.getName());

        MushroomPlace place = placeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Место не найдено"));

        User user = (User) authentication.getPrincipal();
        if (!place.getOwner().getId().equals(user.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Вы не владелец этого места"));
        }

        try {
            String imageUrl = storageService.uploadImage(file, id);

            // Обновляем главное фото места (опционально)
            if (place.getImageUrl() == null) {
                place.setImageUrl(imageUrl);
                placeRepository.save(place);
            }

            log.info("Image uploaded successfully: {}", imageUrl);
            return ResponseEntity.ok(Map.of(
                    "id", System.currentTimeMillis(),
                    "url", imageUrl,
                    "uploadedAt", java.time.LocalDateTime.now().toString()
            ));

        } catch (IllegalArgumentException e) {
            log.warn("Validation error: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Upload error", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Ошибка загрузки: " + e.getMessage()));
        }
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    private MushroomPlaceResponse convertToResponse(MushroomPlace place) {
        // 🆕 Безопасное получение типа гриба
        MushroomTypeResponse mushroomTypeResponse = null;
        if (place.getMushroomType() != null) {
            MushroomType mt = place.getMushroomType();
            mushroomTypeResponse = MushroomTypeResponse.builder()
                    .id(mt.getId())
                    .name(mt.getName())
                    .latinName(mt.getLatinName())
                    .category(mt.getCategory())
                    .imageUrl(mt.getImageUrl())
                    .description(mt.getDescription())
                    .build();
        }

        return MushroomPlaceResponse.builder()
                .id(place.getId())
                .title(place.getTitle())
                .description(place.getDescription())
                .latitude(place.getLatitude())
                .longitude(place.getLongitude())
                .address(place.getAddress())
                .imageUrl(place.getImageUrl())
                .createdAt(place.getCreatedAt())
                .ownerId(place.getOwner().getId())
                .ownerUsername(place.getOwner().getUsername())
                .mushroomType(mushroomTypeResponse) // 🆕 Может быть null
                .images(place.getImages() != null ? place.getImages().stream()
                        .map(img -> ImageResponse.builder()
                                .id(img.getId())
                                .url(img.getUrl())
                                .uploadedAt(img.getUploadedAt())
                                .build())
                        .collect(Collectors.toList()) : List.of())
                .build();
    }

    // ============================================
    // DTO CLASSES
    // ============================================

    @lombok.Data
    @lombok.Builder
    public static class MushroomPlaceResponse {
        private Long id;
        private String title;
        private String description;
        private Double latitude;
        private Double longitude;
        private String address;
        private String imageUrl;
        private java.time.LocalDateTime createdAt;
        private Long ownerId;
        private String ownerUsername;
        private MushroomTypeResponse mushroomType;
        private List<ImageResponse> images;
    }

    @lombok.Data
    @lombok.Builder
    public static class MushroomTypeResponse {
        private Long id;
        private String name;
        private String latinName;
        private by.forestapp.stepOne.model.EdibilityCategory category;
        private String imageUrl;
        private String description;
    }

    @lombok.Data
    @lombok.Builder
    public static class ImageResponse {
        private Long id;
        private String url;
        private java.time.LocalDateTime uploadedAt;
    }
}