package by.forestapp.stepOne.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "mushroom_types")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = "places")
public class MushroomType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100, unique = true)
    private String name; // "Белый гриб", "Подберёзовик"

    @Column(length = 100)
    private String latinName; // "Boletus edulis"

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EdibilityCategory category; // EDIBLE, CONDITIONALLY_EDIBLE, POISONOUS

    @Column(length = 1000)
    private String iconUrl;

    // 🍄 Один тип → много мест (обратная сторона связи)
    @OneToMany(mappedBy = "mushroomType", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    @JsonIgnoreProperties({"mushroomType", "hibernateLazyInitializer", "handler"})
    private List<MushroomPlace> places = new ArrayList<>();
}