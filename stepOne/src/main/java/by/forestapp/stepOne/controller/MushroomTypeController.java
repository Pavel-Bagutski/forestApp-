package by.forestapp.stepOne.controller;

import by.forestapp.stepOne.model.MushroomType;
import by.forestapp.stepOne.repository.MushroomTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/mushroom-types")
@RequiredArgsConstructor
public class MushroomTypeController {

    private final MushroomTypeRepository mushroomTypeRepository;

    @GetMapping
    public List<MushroomType> getAllTypes() {
        return mushroomTypeRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<MushroomType> getType(@PathVariable Long id) {
        return mushroomTypeRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}