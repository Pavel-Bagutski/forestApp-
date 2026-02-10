package by.forestapp.stepOne.service;

import kong.unirest.HttpResponse;
import kong.unirest.Unirest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

@Slf4j
@Service
public class StorageService {

    @Value("${storage.supabase.url}")
    private String supabaseUrl;

    @Value("${storage.supabase.key}")
    private String supabaseKey;

    @Value("${storage.supabase.bucket}")
    private String bucketName;

    public String uploadImage(MultipartFile file, Long placeId) {
        validateFile(file);

        try {
            String extension = getExtension(file.getOriginalFilename());
            String filename = String.format("places/%d/%s.%s",
                    placeId,
                    UUID.randomUUID().toString(),
                    extension
            );

            log.info("Uploading file: {} to bucket: {}", filename, bucketName);

            String uploadUrl = String.format("%s/storage/v1/object/%s/%s",
                    supabaseUrl, bucketName, filename);

            // Unirest загрузка
            HttpResponse<String> response = Unirest.post(uploadUrl)
                    .header("apikey", supabaseKey)
                    .header("Authorization", "Bearer " + supabaseKey)
                    .header("Content-Type", file.getContentType())
                    .body(file.getBytes())
                    .asString();

            log.info("Response status: {}", response.getStatus());
            log.info("Response body: {}", response.getBody());

            if (response.getStatus() >= 200 && response.getStatus() < 300) {
                String publicUrl = String.format("%s/storage/v1/object/public/%s/%s",
                        supabaseUrl, bucketName, filename);

                log.info("Upload SUCCESS! URL: {}", publicUrl);
                return publicUrl;
            } else {
                throw new RuntimeException("Upload failed: " + response.getBody());
            }

        } catch (IOException e) {
            log.error("Failed to read file", e);
            throw new RuntimeException("Не удалось прочитать файл", e);
        } catch (Exception e) {
            log.error("Upload FAILED: {}", e.getMessage(), e);
            throw new RuntimeException("Не удалось загрузить изображение: " + e.getMessage(), e);
        }
    }

    public void deleteImage(String imageUrl) {
        try {
            String prefix = "/storage/v1/object/public/" + bucketName + "/";
            int index = imageUrl.indexOf(prefix);

            if (index == -1) {
                log.warn("Could not extract key from URL: {}", imageUrl);
                return;
            }

            String key = imageUrl.substring(index + prefix.length());
            String deleteUrl = String.format("%s/storage/v1/object/%s/%s",
                    supabaseUrl, bucketName, key);

            HttpResponse<String> response = Unirest.delete(deleteUrl)
                    .header("apikey", supabaseKey)
                    .header("Authorization", "Bearer " + supabaseKey)
                    .asString();

            log.info("Deleted image: {}, status: {}", key, response.getStatus());
        } catch (Exception e) {
            log.error("Failed to delete image: {}", imageUrl, e);
        }
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Файл не выбран");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Разрешены только изображения");
        }

        if (file.getSize() > 5 * 1024 * 1024) {
            throw new IllegalArgumentException("Файл слишком большой (макс 5MB)");
        }

        String ext = getExtension(file.getOriginalFilename());
        if (!ext.matches("jpg|jpeg|png|webp")) {
            throw new IllegalArgumentException("Формат не поддерживается");
        }
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "jpg";
        }
        return filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
    }
}