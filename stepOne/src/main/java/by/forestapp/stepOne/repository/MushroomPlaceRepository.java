package by.forestapp.stepOne.repository;

import by.forestapp.stepOne.model.EdibilityCategory;
import by.forestapp.stepOne.model.MushroomPlace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MushroomPlaceRepository extends JpaRepository<MushroomPlace, Long> {

    @Query("SELECT DISTINCT p FROM MushroomPlace p LEFT JOIN FETCH p.images")
    List<MushroomPlace> findAllWithImages();

    @Query("SELECT p FROM MushroomPlace p LEFT JOIN FETCH p.images WHERE p.id = :id")
    Optional<MushroomPlace> findByIdWithImages(Long id);

    // 🆕 НОВЫЕ методы для фильтрации
    @Query("SELECT DISTINCT p FROM MushroomPlace p " +
            "LEFT JOIN FETCH p.images " +
            "JOIN p.mushroomTypes mt " +
            "WHERE mt.id IN :typeIds")
    List<MushroomPlace> findByMushroomTypesIdIn(@Param("typeIds") List<Long> typeIds);

    @Query("SELECT DISTINCT p FROM MushroomPlace p " +
            "LEFT JOIN FETCH p.images " +
            "JOIN p.mushroomTypes mt " +
            "WHERE mt.category = :category")
    List<MushroomPlace> findByMushroomTypesCategory(@Param("category") EdibilityCategory category);
}