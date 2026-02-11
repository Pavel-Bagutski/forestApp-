package by.forestapp.stepOne.controller;

import by.forestapp.stepOne.model.EdibilityCategory;
import by.forestapp.stepOne.model.MushroomPlace;
import by.forestapp.stepOne.model.PlaceImage;
import by.forestapp.stepOne.model.User;
import by.forestapp.stepOne.repository.MushroomPlaceRepository;
import by.forestapp.stepOne.repository.PlaceImageRepository;
import by.forestapp.stepOne.repository.UserRepository;
import by.forestapp.stepOne.service.StorageService;
import jakarta.validation.Valid;
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
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/places")
@RequiredArgsConstructor
public class PlacesController {

    private final StorageService storageService;
    private final MushroomPlaceRepository placeRepository;
    private final PlaceImageRepository placeImageRepository;
    private final UserRepository userRepository;

    // 🆕 ОБНОВЛЕННЫЙ метод с фильтрацией
    @GetMapping
    public List<MushroomPlace> getAllPlaces(
            @RequestParam(required = false) List<Long> mushroomTypeIds,
            @RequestParam(required = false) EdibilityCategory category) {

        if (mushroomTypeIds != null && !mushroomTypeIds.isEmpty()) {
            return placeRepository.findByMushroomTypesIdIn(mushroomTypeIds);
        }
        if (category != null) {
            return placeRepository.findByMushroomTypesCategory(category);
        }
        return placeRepository.findAllWithImages();
    }

    @GetMapping("/{id}")
    public ResponseEntity<MushroomPlace> getPlace(@PathVariable Long id) {
        return placeRepository.findByIdWithImages(id)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Место не найдено"));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<MushroomPlace> createPlace(
            @Valid @RequestBody MushroomPlaceRequest request,
            Authentication authentication) {

        String email = authentication.getName();
        User owner = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Пользователь не найден"));

        MushroomPlace place = MushroomPlace.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .address(request.getAddress())
                .imageUrl(request.getImageUrl())
                .owner(owner)
                .build();

        MushroomPlace saved = placeRepository.save(place);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<MushroomPlace> updatePlace(
            @PathVariable Long id,
            @Valid @RequestBody MushroomPlaceRequest request,
            Authentication authentication) {

        MushroomPlace place = placeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Место не найдено"));

        if (!place.getOwner().getEmail().equals(authentication.getName())
                && !authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        place.setTitle(request.getTitle());
        place.setDescription(request.getDescription());
        place.setLatitude(request.getLatitude());
        place.setLongitude(request.getLongitude());
        place.setAddress(request.getAddress());
        place.setImageUrl(request.getImageUrl());

        MushroomPlace updated = placeRepository.save(place);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<?> deletePlace(@PathVariable Long id, Authentication authentication) {
        MushroomPlace place = placeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Место не найдено"));

        if (!place.getOwner().getEmail().equals(authentication.getName())
                && !authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Нет прав на удаление"));
        }

        List<PlaceImage> images = placeImageRepository.findByPlaceId(id);
        images.forEach(img -> storageService.deleteImage(img.getUrl()));

        placeRepository.delete(place);
        return ResponseEntity.ok(Map.of("message", "Место удалено"));
    }

    @PostMapping(value = "/{id}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @Transactional
    public ResponseEntity<?> uploadImage(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {

        MushroomPlace place = placeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Место не найдено"));

        if (!place.getOwner().getEmail().equals(authentication.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Вы не владелец этого места"));
        }

        try {
            String imageUrl = storageService.uploadImage(file, id);

            PlaceImage placeImage = PlaceImage.builder()
                    .url(imageUrl)
                    .place(place)
                    .uploadedAt(LocalDateTime.now())
                    .build();
            placeImageRepository.save(placeImage);

            return ResponseEntity.ok(Map.of(
                    "id", placeImage.getId(),
                    "url", imageUrl,
                    "message", "Изображение загружено"
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Ошибка сервера"));
        }
    }

    @GetMapping("/{id}/images")
    public ResponseEntity<List<PlaceImage>> getImages(@PathVariable Long id) {
        List<PlaceImage> images = placeImageRepository.findByPlaceId(id);
        return ResponseEntity.ok(images);
    }

    @DeleteMapping("/{id}/images/{imageId}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<?> deleteImage(
            @PathVariable Long id,
            @PathVariable Long imageId,
            Authentication authentication) {

        PlaceImage image = placeImageRepository.findById(imageId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Изображение не найдено"));

        if (!image.getPlace().getOwner().getEmail().equals(authentication.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        storageService.deleteImage(image.getUrl());
        placeImageRepository.delete(image);

        return ResponseEntity.ok(Map.of("message", "Изображение удалено"));
    }

    public static class MushroomPlaceRequest {
        private String title;
        private String description;
        private Double latitude;
        private Double longitude;
        private String address;
        private String imageUrl;

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
    }
}