package by.forestapp.stepOne.model;

import jakarta.persistence.*;
import lombok.*;

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

    @Column(nullable = false, unique = true, length = 200)
    private String name;

    @Column(length = 100)
    private String latinName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EdibilityCategory category;

    // 🆕 Добавь это поле если отсутствует
    @Column(length = 1000)
    private String imageUrl;

    @Column(columnDefinition = "TEXT")
    private String description;
}