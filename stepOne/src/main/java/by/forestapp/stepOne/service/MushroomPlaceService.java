package by.forestapp.stepOne.service;

import by.forestapp.stepOne.dto.MushroomPlaceRequest;
import by.forestapp.stepOne.model.MushroomPlace;
import by.forestapp.stepOne.model.MushroomType;
import by.forestapp.stepOne.model.User;
import by.forestapp.stepOne.repository.MushroomPlaceRepository;
import by.forestapp.stepOne.repository.MushroomTypeRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MushroomPlaceService {

    private final MushroomPlaceRepository placeRepository;
    private final MushroomTypeRepository typeRepository;

    @Transactional
    public MushroomPlace createPlace(MushroomPlaceRequest request, User user) {
        MushroomPlace place = new MushroomPlace();
        place.setTitle(request.getTitle());
        place.setDescription(request.getDescription());
        place.setLatitude(request.getLatitude());
        place.setLongitude(request.getLongitude());
        place.setAddress(request.getAddress());
        place.setOwner(user);

        // ✅ Установка типа гриба
        if (request.getMushroomTypeId() != null) {
            MushroomType type = typeRepository.findById(request.getMushroomTypeId())
                    .orElseThrow(() -> new EntityNotFoundException("Тип гриба не найден"));
            place.setMushroomType(type);
        }

        return placeRepository.save(place);
    }

    @Transactional
    public MushroomPlace updatePlace(Long id, MushroomPlaceRequest request, User user) {
        MushroomPlace place = placeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Место не найдено"));

        if (!place.getOwner().getId().equals(user.getId())) {
            throw new AccessDeniedException("Нет прав на редактирование");
        }

        place.setTitle(request.getTitle());
        place.setDescription(request.getDescription());
        place.setLatitude(request.getLatitude());
        place.setLongitude(request.getLongitude());
        place.setAddress(request.getAddress());

        // ✅ Обновление типа гриба
        if (request.getMushroomTypeId() != null) {
            MushroomType type = typeRepository.findById(request.getMushroomTypeId())
                    .orElseThrow(() -> new EntityNotFoundException("Тип гриба не найден"));
            place.setMushroomType(type);
        } else {
            place.setMushroomType(null);
        }

        return placeRepository.save(place);
    }

    @Transactional
    public void deletePlace(Long id, User user) {
        MushroomPlace place = placeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Место не найдено"));

        if (!place.getOwner().getId().equals(user.getId())) {
            throw new AccessDeniedException("Нет прав на удаление");
        }

        placeRepository.delete(place);
    }
}