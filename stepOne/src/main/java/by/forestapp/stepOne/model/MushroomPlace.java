package by.forestapp.stepOne.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "mushroom_places")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"owner", "images", "comments", "mushroomType"})
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

    // 🍄 Связь с типом гриба (много мест → один тип)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mushroom_type_id")
    @JsonIgnoreProperties({"places", "hibernateLazyInitializer", "handler"})
    private MushroomType mushroomType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    @JsonIgnoreProperties({"places", "hibernateLazyInitializer", "handler"})
    private User owner;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "place", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @JsonIgnoreProperties("place")
    private List<PlaceImage> images = new ArrayList<>();

    @OneToMany(mappedBy = "place", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Comment> comments = new ArrayList<>();

    public void addImage(PlaceImage image) {
        images.add(image);
        image.setPlace(this);
    }

    public void removeImage(PlaceImage image) {
        images.remove(image);
        image.setPlace(null);
    }

    public void addComment(Comment comment) {
        comments.add(comment);
        comment.setPlace(this);
    }

    public void removeComment(Comment comment) {
        comments.remove(comment);
        comment.setPlace(null);
    }
}