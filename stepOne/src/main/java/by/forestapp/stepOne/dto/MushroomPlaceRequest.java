package by.forestapp.stepOne.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MushroomPlaceRequest {

    @NotBlank(message = "Название обязательно")
    private String title;

    private String description;

    @NotNull(message = "Широта обязательна")
    private Double latitude;

    @NotNull(message = "Долгота обязательна")
    private Double longitude;

    private String address;

    // ✅ ID типа гриба (вместо строки)
    private Long mushroomTypeId;
}