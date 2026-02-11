package by.forestapp.stepOne.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "place_images")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PlaceImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 1000)
    private String url;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "place_id", nullable = false)
    @JsonIgnore  // ← РАЗРЫВАЕМ ЦИКЛ! Не сериализуем обратную ссылку на место
    private MushroomPlace place;

    private LocalDateTime uploadedAt;
}