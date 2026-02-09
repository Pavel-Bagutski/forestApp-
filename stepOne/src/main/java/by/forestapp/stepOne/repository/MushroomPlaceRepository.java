// MushroomPlaceRepository.java
package by.forestapp.stepOne.repository;

import by.forestapp.stepOne.model.MushroomPlace;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MushroomPlaceRepository extends JpaRepository<MushroomPlace, Long> {
}