package by.forestapp.stepOne.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * ============================================================================
 * МОДЕЛЬ: Изображение места (PlaceImage)
 * ============================================================================
 *
 * "ЧТО ЭТО": Сущность БД - таблица place_images
 * "СВЯЗЬ": Many-to-One с MushroomPlace
 */
@Entity
@Table(name = "place_images")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = "place")
@EqualsAndHashCode(of = "id")
public class PlaceImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 1000)
    private String url;

    @CreationTimestamp
    @Column(name = "uploaded_at", updatable = false)
    private LocalDateTime uploadedAt;

    /**
     * "ЧТО ЭТО": Место, к которому относится фото
     * "ОБЯЗАТЕЛЬНОСТЬ": false (может быть временным без привязки)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "place_id")
    private MushroomPlace place;
}