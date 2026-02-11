package by.forestapp.stepOne.repository;

import by.forestapp.stepOne.model.MushroomType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MushroomTypeRepository extends JpaRepository<MushroomType, Long> {
}