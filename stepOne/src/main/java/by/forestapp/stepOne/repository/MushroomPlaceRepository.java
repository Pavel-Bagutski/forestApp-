package by.forestapp.stepOne.repository;

import by.forestapp.stepOne.model.EdibilityCategory;
import by.forestapp.stepOne.model.MushroomPlace;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MushroomPlaceRepository extends JpaRepository<MushroomPlace, Long> {

    List<MushroomPlace> findByOwnerId(Long ownerId);

    // ✅ ИСПРАВЛЕНО: mushroomType -> mushroomTypes + добавлен JOIN
    @Query("SELECT DISTINCT p FROM MushroomPlace p " +
            "LEFT JOIN FETCH p.images " +
            "JOIN p.mushroomTypes mt " +
            "WHERE mt.category = :category")
    List<MushroomPlace> findByMushroomTypeCategory(@Param("category") EdibilityCategory category);

    // ✅ ИСПРАВЛЕНО: mushroomType -> mushroomTypes + добавлен JOIN
    @Query("SELECT DISTINCT p FROM MushroomPlace p " +
            "LEFT JOIN FETCH p.images " +
            "JOIN p.mushroomTypes mt " +
            "WHERE mt.id = :typeId")
    List<MushroomPlace> findByMushroomTypeId(@Param("typeId") Long typeId);

    @Query("SELECT DISTINCT p FROM MushroomPlace p LEFT JOIN FETCH p.images WHERE p.owner.id = :ownerId")
    List<MushroomPlace> findByOwnerIdWithImages(@Param("ownerId") Long ownerId);

    @Query("SELECT DISTINCT p FROM MushroomPlace p LEFT JOIN FETCH p.images WHERE p.id = :id")
    Optional<MushroomPlace> findByIdWithImages(@Param("id") Long id);

    @Query("SELECT DISTINCT p FROM MushroomPlace p LEFT JOIN FETCH p.images")
    List<MushroomPlace> findAllWithImages();

    @Query("SELECT DISTINCT p FROM MushroomPlace p LEFT JOIN FETCH p.images ORDER BY p.createdAt DESC")
    List<MushroomPlace> findRecentWithImages(Pageable pageable);
}