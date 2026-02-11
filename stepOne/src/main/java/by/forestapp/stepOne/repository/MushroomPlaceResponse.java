package by.forestapp.stepOne.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class MushroomPlaceResponse {

    private Long id;
    private String title;
    private String description;
    private Double latitude;
    private Double longitude;
    private String address;
    private String imageUrl;
    private LocalDateTime createdAt;
    private Long ownerId;
    private String ownerUsername;
    private String mushroomType; // Название типа гриба
    private List<ImageResponse> images;

    @Data
    @Builder
    public static class ImageResponse {
        private Long id;
        private String url;
        private LocalDateTime uploadedAt;
    }
}