package by.forestapp.stepOne.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class StorageService {

    @Value("${storage.supabase.url}")
    private String supabaseUrl;

    @Value("${storage.supabase.key}")
    private String supabaseKey;

    @Value("${storage.supabase.bucket}")
    private String bucketName;

    private S3Client s3Client;

    @PostConstruct
    public void init() {
        // Supabase S3 endpoint
        String endpoint = supabaseUrl.replace("/storage/v1", "");

        this.s3Client = S3Client.builder()
                .endpointOverride(java.net.URI.create(endpoint))
                .region(Region.of("eu-central-1"))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(supabaseKey, supabaseKey)
                ))
                .build();

        log.info("StorageService initialized with bucket: {}", bucketName);
    }

    public String uploadImage(MultipartFile file, Long placeId) {
        validateFile(file);

        try {
            String extension = getExtension(file.getOriginalFilename());
            String filename = String.format("places/%d/%s.%s",
                    placeId,
                    UUID.randomUUID().toString(),
                    extension
            );

            s3Client.putObject(
                    PutObjectRequest.builder()
                            .bucket(bucketName)
                            .key(filename)
                            .contentType(file.getContentType())
                            .build(),
                    RequestBody.fromBytes(file.getBytes())
            );

            // Публичный URL
            return String.format("%s/object/public/%s/%s",
                    supabaseUrl, bucketName, filename);

        } catch (IOException e) {
            log.error("Failed to upload file", e);
            throw new RuntimeException("Не удалось загрузить изображение", e);
        }
    }

    public void deleteImage(String imageUrl) {
        try {
            // Извлекаем ключ из URL
            String key = imageUrl.substring(imageUrl.indexOf(bucketName) + bucketName.length() + 1);

            s3Client.deleteObject(
                    DeleteObjectRequest.builder()
                            .bucket(bucketName)
                            .key(key)
                            .build()
            );

            log.info("Deleted image: {}", key);
        } catch (Exception e) {
            log.error("Failed to delete image: {}", imageUrl, e);
        }
    }

    private void validateFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Файл пустой");
        }

        if (!file.getContentType().startsWith("image/")) {
            throw new IllegalArgumentException("Только изображения (JPEG, PNG, WebP)");
        }

        // Максимум 5MB
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new IllegalArgumentException("Файл слишком большой (макс 5MB)");
        }

        // Разрешённые форматы
        String ext = getExtension(file.getOriginalFilename());
        if (!ext.matches("jpg|jpeg|png|webp")) {
            throw new IllegalArgumentException("Формат не поддерживается. Используйте: JPG, PNG, WebP");
        }
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "jpg";
        }
        return filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
    }
}