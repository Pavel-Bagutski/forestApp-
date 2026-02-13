package by.forestapp.stepOne.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "mushroom_places")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"owner", "images", "comments", "mushroomTypes"})
public class MushroomPlace {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column(length = 500)
    private String address;

    @Column(length = 1000)
    private String imageUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    @JsonIgnoreProperties({"places", "hibernateLazyInitializer", "handler"})
    private User owner;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    // ✅ ИСПРАВЛЕНО: Many-to-Many для типов грибов (как в вашем первом варианте)
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "place_mushroom_types",
            joinColumns = @JoinColumn(name = "place_id"),
            inverseJoinColumns = @JoinColumn(name = "mushroom_type_id")
    )
    @Builder.Default
    @JsonIgnoreProperties("places")
    private Set<MushroomType> mushroomTypes = new HashSet<>();

    @OneToMany(mappedBy = "place", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @JsonIgnoreProperties("place")
    private List<PlaceImage> images = new ArrayList<>();

    @OneToMany(mappedBy = "place", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Comment> comments = new ArrayList<>();

    // ==========================================
    // МЕТОДЫ ДЛЯ ТИПОВ ГРИБОВ
    // ==========================================

    /**
     * ✅ УСТАРЕВШИЙ: Один тип (для обратной совместимости)
     * Лучше использовать addMushroomType() для множественных типов
     */
    public void setMushroomType(MushroomType type) {
        this.mushroomTypes.clear();
        if (type != null) {
            this.mushroomTypes.add(type);
        }
    }

    /**
     * ✅ Получить первый тип (для совместимости)
     */
    public MushroomType getMushroomType() {
        return this.mushroomTypes.isEmpty() ? null :
                this.mushroomTypes.iterator().next();
    }

    /**
     * ✅ Добавить тип гриба
     */
    public void addMushroomType(MushroomType type) {
        if (type != null) {
            this.mushroomTypes.add(type);
        }
    }

    /**
     * ✅ Удалить тип гриба
     */
    public void removeMushroomType(MushroomType type) {
        this.mushroomTypes.remove(type);
    }

    // ==========================================
    // МЕТОДЫ ДЛЯ ИЗОБРАЖЕНИЙ
    // ==========================================

    public void addImage(PlaceImage image) {
        images.add(image);
        image.setPlace(this);
    }

    public void removeImage(PlaceImage image) {
        images.remove(image);
        image.setPlace(null);
    }

    // ==========================================
    // МЕТОДЫ ДЛЯ КОММЕНТАРИЕВ
    // ==========================================

    public void addComment(Comment comment) {
        comments.add(comment);
        comment.setPlace(this);
    }

    public void removeComment(Comment comment) {
        comments.remove(comment);
        comment.setPlace(null);
    }
}