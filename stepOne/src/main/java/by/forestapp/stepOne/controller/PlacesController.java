package by.forestapp.stepOne.controller;

import by.forestapp.stepOne.dto.MushroomPlaceRequest;
import by.forestapp.stepOne.dto.MushroomPlaceResponse;
import by.forestapp.stepOne.model.EdibilityCategory;
import by.forestapp.stepOne.model.MushroomPlace;
import by.forestapp.stepOne.model.User;
import by.forestapp.stepOne.repository.MushroomPlaceRepository;
import by.forestapp.stepOne.repository.MushroomTypeRepository;
import by.forestapp.stepOne.service.MushroomPlaceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/places")
@RequiredArgsConstructor
public class PlacesController {

    private final MushroomPlaceService placeService;
    private final MushroomPlaceRepository placeRepository;
    private final MushroomTypeRepository typeRepository;

    @GetMapping
    public List<MushroomPlaceResponse> getAllPlaces() {
        return placeRepository.findAllWithImages().stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MushroomPlaceResponse> getPlace(@PathVariable Long id) {
        return placeRepository.findByIdWithImages(id)
                .map(this::convertToResponse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/my")
    public List<MushroomPlaceResponse> getMyPlaces(@AuthenticationPrincipal User user) {
        return placeRepository.findByOwnerIdWithImages(user.getId()).stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    // ✅ Исправлено: mushroomTypes -> mushroomType
    @GetMapping("/by-category/{category}")
    public List<MushroomPlaceResponse> getByCategory(@PathVariable EdibilityCategory category) {
        return placeRepository.findByMushroomTypeCategory(category).stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    // ✅ Исправлено: mushroomTypes -> mushroomType
    @GetMapping("/by-type/{typeId}")
    public List<MushroomPlaceResponse> getByType(@PathVariable Long typeId) {
        return placeRepository.findByMushroomTypeId(typeId).stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @GetMapping("/recent")
    public List<MushroomPlaceResponse> getRecent(@RequestParam(defaultValue = "10") int limit) {
        return placeRepository.findRecentWithImages(PageRequest.of(0, limit)).stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @PostMapping
    public ResponseEntity<MushroomPlaceResponse> createPlace(
            @Valid @RequestBody MushroomPlaceRequest request,
            @AuthenticationPrincipal User user) {

        MushroomPlace place = placeService.createPlace(request, user);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(convertToResponse(place));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MushroomPlaceResponse> updatePlace(
            @PathVariable Long id,
            @Valid @RequestBody MushroomPlaceRequest request,
            @AuthenticationPrincipal User user) {

        MushroomPlace place = placeService.updatePlace(id, request, user);
        return ResponseEntity.ok(convertToResponse(place));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePlace(@PathVariable Long id, @AuthenticationPrincipal User user) {
        placeService.deletePlace(id, user);
        return ResponseEntity.noContent().build();
    }

    private MushroomPlaceResponse convertToResponse(MushroomPlace place) {
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
                // ✅ Добавлено: тип гриба
                .mushroomType(place.getMushroomType() != null ?
                        place.getMushroomType().getName() : null)
                .images(place.getImages().stream()
                        .map(img -> MushroomPlaceResponse.ImageResponse.builder()
                                .id(img.getId())
                                .url(img.getUrl())
                                .uploadedAt(img.getUploadedAt())
                                .build())
                        .collect(Collectors.toList()))
                .build();
    }
}