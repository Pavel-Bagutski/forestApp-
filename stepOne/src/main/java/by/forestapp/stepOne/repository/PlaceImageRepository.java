package by.forestapp.stepOne.repository;

import by.forestapp.stepOne.model.PlaceImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * ============================================================================
 * РЕПОЗИТОРИЙ ИЗОБРАЖЕНИЙ МЕСТ
 * ============================================================================
 *
 * "ЧТО ЭТО": DAO (Data Access Object) для работы с таблицей place_images
 * "НАСЛЕДУЕТ": JpaRepository - стандартные CRUD операции
 *
 * "МЕТОДЫ":
 *   - Стандартные: save, findById, findAll, delete, count
 *   - Кастомные: findByPlaceId, countByPlaceId, findFirstByPlaceId
 */
@Repository
public interface PlaceImageRepository extends JpaRepository<PlaceImage, Long> {

    /**
     * "ЧТО ДЕЛАЕТ": Находит все фото конкретного места
     * "ПАРАМЕТР": placeId - ID места
     * "ВОЗВРАТ": Список изображений (может быть пустым)
     *
     * SQL эквивалент: SELECT * FROM place_images WHERE place_id = ?
     */
    List<PlaceImage> findByPlaceId(Long placeId);

    /**
     * "ЧТО ДЕЛАЕТ": Считает количество фото у места
     * "ЗАЧЕМ": Проверка лимита (макс. 10 фото)
     * "ВОЗВРАТ": Число фото (0, если нет)
     *
     * SQL эквивалент: SELECT COUNT(*) FROM place_images WHERE place_id = ?
     */
    long countByPlaceId(Long placeId);

    /**
     * "ЧТО ДЕЛАЕТ": Находит первое фото места (для превью)
     * "ЗАЧЕМ": Показать иконку на карте без загрузки всех фото
     */
    Optional<PlaceImage> findFirstByPlaceIdOrderByUploadedAtAsc(Long placeId);

    /**
     * "ЧТО ДЕЛАЕТ": Удаляет все фото места
     * "ЗАЧЕМ": При удалении места каскадно удалить фото
     *
     * SQL эквивалент: DELETE FROM place_images WHERE place_id = ?
     */
    void deleteByPlaceId(Long placeId);

    /**
     * "ЧТО ДЕЛАЕТ": Проверяет существование фото у места
     * "ВОЗВРАТ": true, если есть хотя бы одно фото
     */
    boolean existsByPlaceId(Long placeId);

    /**
     * "ЧТО ДЕЛАЕТ": Находит фото по URL (для проверки дубликатов)
     */
    Optional<PlaceImage> findByUrl(String url);

    /**
     * "ЧТО ДЕЛАЕТ": Получает последние N фото для ленты активности
     */
    @Query("SELECT pi FROM PlaceImage pi ORDER BY pi.uploadedAt DESC")
    List<PlaceImage> findRecentImages(@Param("limit") int limit);
}