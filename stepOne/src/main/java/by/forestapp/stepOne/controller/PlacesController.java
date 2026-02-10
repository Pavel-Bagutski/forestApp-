package by.forestapp.stepOne.controller;

import by.forestapp.stepOne.model.MushroomPlace;
import by.forestapp.stepOne.model.User;
import by.forestapp.stepOne.repository.MushroomPlaceRepository;
import by.forestapp.stepOne.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/places")
@RequiredArgsConstructor
public class PlacesController {

    private final MushroomPlaceRepository placeRepository;
    private final UserRepository userRepository;

    // 1. Все могут видеть список точек (для карты)
    @GetMapping
    public List<MushroomPlace> getAllPlaces() {
        return placeRepository.findAll();
    }

    // 2. Детали одной точки (все могут смотреть)
    @GetMapping("/{id}")
    public ResponseEntity<MushroomPlace> getPlace(@PathVariable Long id) {
        return placeRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Место не найдено"));
    }

    // 3. Создать новую точку — только авторизованные пользователи (USER или ADMIN)
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
                .address(request.getAddress())      // 🆕 Область/район/адрес
                .imageUrl(request.getImageUrl())    // 🆕 URL фото
                .owner(owner)
                .build();

        MushroomPlace saved = placeRepository.save(place);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // 🆕 DTO для создания точки (внутренний класс)
    public static class MushroomPlaceRequest {
        private String title;
        private String description;
        private Double latitude;
        private Double longitude;
        private String address;     // 🆕
        private String imageUrl;    // 🆕

        // Геттеры и сеттеры
        public String getTitle() {
            return title;
        }
        public void setTitle(String title) {
            this.title = title;
        }

        public String getDescription() {
            return description;
        }
        public void setDescription(String description) {
            this.description = description;
        }

        public Double getLatitude() {
            return latitude;
        }
        public void setLatitude(Double latitude) {
            this.latitude = latitude;
        }

        public Double getLongitude() {
            return longitude;
        }
        public void setLongitude(Double longitude) {
            this.longitude = longitude;
        }

        // 🆕 Новые геттеры и сеттеры
        public String getAddress() {
            return address;
        }
        public void setAddress(String address) {
            this.address = address;
        }

        public String getImageUrl() {
            return imageUrl;
        }
        public void setImageUrl(String imageUrl) {
            this.imageUrl = imageUrl;
        }
    }
}