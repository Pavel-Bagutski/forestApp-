package by.forestapp.stepOne.service;

import kong.unirest.HttpResponse;
import kong.unirest.Unirest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * ============================================================================
 * СЕРВИС ХРАНЕНИЯ ФАЙЛОВ (Supabase Storage)
 * ============================================================================
 *
 * "ЧТО ЭТО": Сервис для загрузки/удаления файлов в облачное хранилище
 * "ТЕХНОЛОГИЯ": Supabase Storage (S3-совместимое API)
 *
 * "МЕТОДЫ":
 *   - uploadImage: загрузка с привязкой к месту
 *   - uploadTempImage: временная загрузка (без привязки)
 *   - deleteImage: удаление файла
 *   - validateFile: проверка файла
 */
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

    // Разрешённые форматы
    private static final Set<String> ALLOWED_TYPES = new HashSet<>(Arrays.asList(
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
    ));

    // Максимальный размер (5 MB)
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024;

    // ==========================================
    // ИНИЦИАЛИЗАЦИЯ
    // ==========================================

    @PostConstruct
    public void init() {
        // Настройка Unirest (таймауты и т.д.)
        Unirest.config()
                .connectTimeout(30000)
                .socketTimeout(60000);
    }

    // ==========================================
    // МЕТОД 1: Загрузка с привязкой к месту
    // ==========================================

    /**
     * "ЧТО ДЕЛАЕТ": Загружает файл в папку места (places/{placeId}/)
     * "ПАРАМЕТРЫ":
     *   - file: файл из multipart-запроса
     *   - placeId: ID места (для структуры папок)
     * "ВОЗВРАТ": Публичный URL загруженного файла
     *
     * Аналогия: как положить фото в конкретную папку на Google Drive
     */
    public String uploadImage(MultipartFile file, Long placeId) {
        validateFile(file);

        try {
            String extension = getExtension(file.getOriginalFilename());

            // Структура: places/123/uuid.jpg
            String filename = String.format("places/%d/%s.%s",
                    placeId,
                    UUID.randomUUID().toString(),
                    extension
            );

            return uploadToSupabase(file, filename);

        } catch (Exception e) {
            throw new RuntimeException(
                    "Не удалось загрузить изображение: " + e.getMessage(), e
            );
        }
    }

    // ==========================================
    // МЕТОД 2: Временная загрузка (НОВЫЙ)
    // ==========================================

    /**
     * "ЧТО ДЕЛАЕТ": Загружает файл во временную папку (temp/)
     * "ЗАЧЕМ": Для сценария "загрузили фото, потом создадим место"
     * "ОСОБЕННОСТЬ": Файлы в temp/ нужно периодически чистить (cron)
     *
     * Аналогия: как камера хранения на вокзале - временное хранение
     */
    public String uploadTempImage(MultipartFile file) {
        validateFile(file);

        try {
            String extension = getExtension(file.getOriginalFilename());

            // Структура: temp/timestamp_uuid.jpg
            String filename = String.format("temp/%d_%s.%s",
                    System.currentTimeMillis(),
                    UUID.randomUUID().toString().substring(0, 8),
                    extension
            );

            return uploadToSupabase(file, filename);

        } catch (Exception e) {
            throw new RuntimeException(
                    "Не удалось загрузить временное изображение: " + e.getMessage(), e
            );
        }
    }

    // ==========================================
    // МЕТОД 3: Удаление файла
    // ==========================================

    /**
     * "ЧТО ДЕЛАЕТ": Удаляет файл из хранилища по URL
     * "ЗАЧЕМ": При удалении фото из места
     */
    public void deleteImage(String imageUrl) {
        try {
            // Извлекаем путь из URL
            // URL: https://.../storage/v1/object/public/images/places/123/uuid.jpg
            // Путь: places/123/uuid.jpg
            String path = extractPathFromUrl(imageUrl);

            String deleteUrl = String.format("%s/storage/v1/object/%s/%s",
                    supabaseUrl, bucketName, path);

            HttpResponse<String> response = Unirest.delete(deleteUrl)
                    .header("apikey", anonKey)
                    .header("Authorization", "Bearer " + serviceKey)
                    .asString();

            if (response.getStatus() < 200 || response.getStatus() >= 300) {
                throw new RuntimeException("Delete failed: " + response.getBody());
            }

        } catch (Exception e) {
            throw new RuntimeException(
                    "Не удалось удалить изображение: " + e.getMessage(), e
            );
        }
    }

    // ==========================================
    // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
    // ==========================================

    /**
     * Валидация файла перед загрузкой
     */
    public void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Файл пустой");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException(
                    String.format("Файл слишком большой (макс. %d MB)", MAX_FILE_SIZE / 1024 / 1024)
            );
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw new IllegalArgumentException(
                    "Неподдерживаемый формат. Разрешены: JPEG, PNG, WebP, GIF"
            );
        }
    }

    /**
     * Получение расширения файла
     */
    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "jpg"; // дефолт
        }
        return filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
    }

    /**
     * Загрузка в Supabase (общий метод)
     */
    private String uploadToSupabase(MultipartFile file, String filename) throws Exception {
        String uploadUrl = String.format("%s/storage/v1/object/%s/%s",
                supabaseUrl, bucketName, filename);

        HttpResponse<String> response = Unirest.post(uploadUrl)
                .header("apikey", anonKey)
                .header("Authorization", "Bearer " + serviceKey)
                .header("Content-Type", file.getContentType())
                .body(file.getBytes())
                .asString();

        if (response.getStatus() >= 200 && response.getStatus() < 300) {
            // Возвращаем публичный URL
            return String.format("%s/storage/v1/object/public/%s/%s",
                    supabaseUrl, bucketName, filename);
        } else {
            throw new RuntimeException("Upload failed: " + response.getBody());
        }
    }

    /**
     * Извлечение пути из публичного URL
     */
    private String extractPathFromUrl(String url) {
        // Убираем базовый URL и /storage/v1/object/public/bucket/
        String prefix = String.format("%s/storage/v1/object/public/%s/",
                supabaseUrl, bucketName);

        if (url.startsWith(prefix)) {
            return url.substring(prefix.length());
        }

        // Fallback: берём всё после последнего /
        int lastSlash = url.lastIndexOf('/');
        if (lastSlash > 0) {
            return url.substring(lastSlash + 1);
        }

        return url;
    }

    /**
     * Перемещение файла (temp → places/{id})
     * "ЗАЧЕМ": При создании места после временной загрузки
     */
    public String moveTempToPlace(String tempUrl, Long placeId) {
        try {
            // Скачиваем временный файл
            byte[] content = Unirest.get(tempUrl)
                    .asBytes()
                    .getBody();

            // Определяем расширение
            String extension = "jpg";
            if (tempUrl.contains(".")) {
                extension = tempUrl.substring(tempUrl.lastIndexOf(".") + 1);
            }

            // Загружаем в новое место
            String newFilename = String.format("places/%d/%s.%s",
                    placeId,
                    UUID.randomUUID().toString(),
                    extension
            );

            String uploadUrl = String.format("%s/storage/v1/object/%s/%s",
                    supabaseUrl, bucketName, newFilename);

            HttpResponse<String> response = Unirest.post(uploadUrl)
                    .header("apikey", anonKey)
                    .header("Authorization", "Bearer " + serviceKey)
                    .header("Content-Type", "image/" + extension)
                    .body(content)
                    .asString();

            if (response.getStatus() >= 200 && response.getStatus() < 300) {
                // Удаляем временный файл
                deleteImage(tempUrl);

                return String.format("%s/storage/v1/object/public/%s/%s",
                        supabaseUrl, bucketName, newFilename);
            } else {
                throw new RuntimeException("Move failed: " + response.getBody());
            }

        } catch (Exception e) {
            throw new RuntimeException(
                    "Не удалось переместить изображение: " + e.getMessage(), e
            );
        }
    }
}