package by.forestapp.stepOne.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "mushroom_types")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MushroomType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name; // "Белый гриб", "Подберёзовик"

    @Column(length = 100)
    private String latinName; // "Boletus edulis"

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EdibilityCategory category; // EDIBLE, CONDITIONALLY_EDIBLE, POISONOUS

    @Column(length = 1000)
    private String iconUrl;

    @ManyToMany(mappedBy = "mushroomTypes")
    @JsonIgnoreProperties("mushroomTypes")
    @Builder.Default
    private Set<MushroomPlace> places = new HashSet<>();
}