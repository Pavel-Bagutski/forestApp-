package by.forestapp.stepOne.config;

import by.forestapp.stepOne.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )

                .authorizeHttpRequests(auth -> auth
                        // 🆕 Публичные эндпоинты (БЕЗ авторизации) - должны быть ПЕРВЫМИ
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/places/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/mushroom-types/**").permitAll()

                        // Админские эндпоинты
                        .requestMatchers("/api/users/**").hasRole("ADMIN")
                        .requestMatchers("/api/user/**").hasRole("USER")

                        // 🆕 Модификация мест только для авторизованных (переопределяем permitAll выше)
                        .requestMatchers(HttpMethod.POST, "/api/places").hasAnyRole("USER" , "ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/places/**").hasAnyRole("USER" , "ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/places/**").hasAnyRole("USER", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/places/*/images").hasAnyRole("USER", "ADMIN")

                        // Все остальные запросы требуют авторизации
                        .anyRequest().authenticated()
                )

                // 🔥 КЛЮЧЕВАЯ СТРОКА
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

















    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of("http://localhost:3000"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
