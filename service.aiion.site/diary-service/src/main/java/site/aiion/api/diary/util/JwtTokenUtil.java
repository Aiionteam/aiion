package site.aiion.api.diary.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;

/**
 * JWT 토큰 파싱 유틸리티
 * auth-service와 동일한 JWT secret을 사용하여 토큰을 검증하고 userId를 추출합니다.
 */
@Component
public class JwtTokenUtil {
    
    @Value("${JWT_SECRET:${jwt.secret:defaultSecretKeyForDevelopmentOnlyChangeInProduction}}")
    private String jwtSecret;
    
    /**
     * SecretKey 생성
     */
    private SecretKey getSigningKey() {
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }
    
    /**
     * JWT 토큰에서 사용자 ID 추출
     * @param token JWT 토큰 (Bearer 접두사 제거된 순수 토큰)
     * @return 사용자 ID (Long)
     */
    public Long getUserIdFromToken(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            
            String subject = claims.getSubject();
            if (subject == null || subject.trim().isEmpty()) {
                return null;
            }
            
            // subject는 users 테이블의 id (String으로 변환된 값)
            return Long.parseLong(subject);
        } catch (Exception e) {
            System.err.println("[JwtTokenUtil] JWT 토큰 파싱 실패: " + e.getMessage());
            return null;
        }
    }
    
    /**
     * JWT 토큰 유효성 검증
     * @param token JWT 토큰 (Bearer 접두사 제거된 순수 토큰)
     * @return 유효 여부
     */
    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (Exception e) {
            System.err.println("[JwtTokenUtil] JWT 토큰 검증 실패: " + e.getMessage());
            return false;
        }
    }
    
    /**
     * Authorization 헤더에서 토큰 추출
     * @param authHeader Authorization 헤더 값 (예: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
     * @return 토큰 문자열 (Bearer 접두사 제거), 없으면 null
     */
    public String extractTokenFromHeader(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return null;
        }
        return authHeader.substring(7); // "Bearer " 제거
    }
}

