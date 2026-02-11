package by.forestapp.stepOne.controller;

import by.forestapp.stepOne.dto.AuthResponse;
import by.forestapp.stepOne.dto.LoginRequest;
import by.forestapp.stepOne.dto.RegisterRequest;
import by.forestapp.stepOne.model.User;
import by.forestapp.stepOne.repository.UserRepository;
import by.forestapp.stepOne.service.JwtService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import by.forestapp.stepOne.model.Role;

@CrossOrigin(
        origins = "http://localhost:3000",                        // твой фронтенд Next.js
        allowedHeaders = "*",                                     // разрешаем все заголовки (включая Authorization)
        methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.OPTIONS, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.PATCH},
        maxAge = 3600                                             // кэш preflight-запроса на 1 час
)
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;   // ← добавлен для аутентификации

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request,
            BindingResult bindingResult) {

        if (bindingResult.hasErrors()) {
            String msg = bindingResult.getFieldErrors().stream()
                    .map(e -> e.getField() + ": " + e.getDefaultMessage())
                    .findFirst()
                    .orElse("Некорректные данные");
            return ResponseEntity.badRequest().body(AuthResponse.error(msg));
        }

        if (userRepository.existsByEmail(request.email())) {
            return ResponseEntity.badRequest().body(AuthResponse.error("Email уже используется"));
        }

        if (userRepository.existsByUsername(request.username())) {
            return ResponseEntity.badRequest().body(AuthResponse.error("Username уже занят"));
        }

        User user = User.builder()
                .email(request.email())
                .username(request.username())
                .firstName(request.firstName())
                .lastName(request.lastName())
                .password(passwordEncoder.encode(request.password()))
                .role(Role.USER)
                .build();

        user = userRepository.save(user);

        String access = jwtService.generateAccessToken(user);
        String refresh = jwtService.generateRefreshToken(user);

        return ResponseEntity.ok(AuthResponse.success(access, refresh, user.getEmail(), user.getRole().name()));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {

        try {
            // Пытаемся аутентифицировать пользователя
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getEmail(),
                            request.getPassword()
                    )
            );

            // Получаем аутентифицированного пользователя
            User user = (User) authentication.getPrincipal();

            // Генерируем токены
            String accessToken = jwtService.generateAccessToken(user);
            String refreshToken = jwtService.generateRefreshToken(user);

            return ResponseEntity.ok(
                    AuthResponse.success(accessToken, refreshToken, user.getEmail(), user.getRole().name())
            );

        } catch (BadCredentialsException e) {
            // Неверный пароль или пользователь не найден
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(AuthResponse.error("Неверный email или пароль"));

        } catch (AuthenticationException e) {
            // Другие ошибки аутентификации
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(AuthResponse.error("Ошибка аутентификации: " + e.getMessage()));
        } catch (Exception e) {
            // Любая другая ошибка (например, проблема с JWT)
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(AuthResponse.error("Внутренняя ошибка сервера"));
        }
    }

    // Тестовый эндпоинт для проверки CORS и доступности
    @GetMapping("/test-cors")
    public String testCors() {
        return "CORS работает! Текущий пользователь может получить доступ.";
    }
}