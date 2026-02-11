package by.forestapp.stepOne.config;

import by.forestapp.stepOne.model.EdibilityCategory;
import by.forestapp.stepOne.model.MushroomType;
import by.forestapp.stepOne.repository.MushroomTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@RequiredArgsConstructor
public class DataSeeder {

    @Bean
    CommandLineRunner seedMushroomTypes(MushroomTypeRepository repo) {
        return args -> {
            if (repo.count() == 0) {
                repo.save(MushroomType.builder()
                        .name("Белый гриб")
                        .latinName("Boletus edulis")
                        .category(EdibilityCategory.EDIBLE)
                        .build());

                repo.save(MushroomType.builder()
                        .name("Подберёзовик")
                        .latinName("Leccinum scabrum")
                        .category(EdibilityCategory.EDIBLE)
                        .build());

                repo.save(MushroomType.builder()
                        .name("Лисичка")
                        .latinName("Cantharellus cibarius")
                        .category(EdibilityCategory.EDIBLE)
                        .build());

                repo.save(MushroomType.builder()
                        .name("Подосиновик")
                        .latinName("Leccinum aurantiacum")
                        .category(EdibilityCategory.EDIBLE)
                        .build());

                repo.save(MushroomType.builder()
                        .name("Сыроежка")
                        .latinName("Russula")
                        .category(EdibilityCategory.CONDITIONALLY_EDIBLE)
                        .build());

                repo.save(MushroomType.builder()
                        .name("Мухомор")
                        .latinName("Amanita muscaria")
                        .category(EdibilityCategory.POISONOUS)
                        .build());

                System.out.println("✅ Типы грибов загружены в БД");
            }
        };
    }
}