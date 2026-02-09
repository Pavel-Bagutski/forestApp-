// PlaceImageRepository.java
package by.forestapp.stepOne.repository;

import by.forestapp.stepOne.model.PlaceImage;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlaceImageRepository extends JpaRepository<PlaceImage, Long> {
}