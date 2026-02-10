package by.forestapp.stepOne.repository;

import by.forestapp.stepOne.model.MushroomPlace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MushroomPlaceRepository extends JpaRepository<MushroomPlace, Long> {

    /**
     * Находит все места с загруженными изображениями (EAGER loading)
     * Использует JOIN FETCH чтобы избежать N+1 проблемы
     */
    @Query("SELECT DISTINCT p FROM MushroomPlace p LEFT JOIN FETCH p.images")
    List<MushroomPlace> findAllWithImages();

    /**
     * Находит место по ID с загруженными изображениями
     */
    @Query("SELECT p FROM MushroomPlace p LEFT JOIN FETCH p.images WHERE p.id = :id")
    Optional<MushroomPlace> findByIdWithImages(Long id);
}