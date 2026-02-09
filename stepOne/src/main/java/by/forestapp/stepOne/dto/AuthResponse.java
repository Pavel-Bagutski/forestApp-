package by.forestapp.stepOne.dto;

import org.springframework.lang.Nullable;

public record AuthResponse(
        @Nullable String accessToken,
        @Nullable String refreshToken,
        @Nullable String email,
        @Nullable String role,
        @Nullable String message   // null при успехе
) {

    public static AuthResponse success(String access, String refresh, String email, String role) {
        return new AuthResponse(access, refresh, email, role, null);
    }

    public static AuthResponse error(String msg) {
        return new AuthResponse(null, null, null, null, msg);
    }
}