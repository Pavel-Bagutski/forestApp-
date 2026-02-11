package by.forestapp.stepOne.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import kong.unirest.HttpResponse;
import kong.unirest.Unirest;

import java.io.IOException;
import java.util.UUID;

@Slf4j
@Service
public class StorageService {

    @Value("${storage.supabase.url}")
    private String supabaseUrl;

    @Value("${storage.supabase.anon-key}")
    private String anonKey;

    @Value("${storage.supabase.service-key}")
    private String serviceKey;

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

            log.info("Upload URL: {}", uploadUrl);

            HttpResponse<String> response = Unirest.post(uploadUrl)
                    .header("Authorization", "Bearer " + serviceKey)
                    .header("Content-Type", file.getContentType())
                    .body(file.getBytes())
                    .asString();

            log.info("Response status: {}", response.getStatus());
            log.info("Response body: {}", response.getBody());

            if (response.getStatus() >= 200 && response.getStatus() < 300) {
                String publicUrl = String.format("%s/storage/v1/object/public/%s/%s",
                        supabaseUrl, bucketName, filename);
                log.info("File uploaded successfully. Public URL: {}", publicUrl);
                return publicUrl;
            } else {
                log.error("Upload failed. Status: {}, Body: {}",
                        response.getStatus(), response.getBody());
                throw new RuntimeException("Ошибка загрузки: " + response.getBody());
            }

        } catch (IOException e) {
            log.error("IO error during upload", e);
            throw new RuntimeException("Ошибка чтения файла", e);
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
            throw new IllegalArgumentException("Формат не поддерживается. Используйте: jpg, jpeg, png, webp");
        }
    }

    private String getExtension(String filename) {
        if (filename == null || filename.lastIndexOf(".") == -1) {
            return "jpg";
        }
        return filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
    }
}