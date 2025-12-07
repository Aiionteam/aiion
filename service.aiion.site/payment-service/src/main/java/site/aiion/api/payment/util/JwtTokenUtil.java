package site.aiion.api.payment.util;

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
     * Authorization 헤더에서 토큰 추출
     */
    public String extractTokenFromHeader(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }
    
    /**
     * JWT 토큰에서 사용자 ID 추출
     */
    public Long getUserIdFromToken(String token) {
        try {
            // 검증 없이 Claims만 파싱 (서명된 토큰의 payload 디코딩)
            String[] parts = token.split("\\.");
            if (parts.length < 2) {
                return null;
            }
            
            // Base64 디코딩으로 payload 추출
            String payload = new String(java.util.Base64.getUrlDecoder().decode(parts[1]));
            
            // JSON 파싱으로 subject 추출
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            com.fasterxml.jackson.databind.JsonNode jsonNode = mapper.readTree(payload);
            String sub = jsonNode.get("sub").asText();
            
            return Long.parseLong(sub);
        } catch (Exception e) {
            System.err.println("[JwtTokenUtil] JWT 토큰 파싱 오류: " + e.getMessage());
            return null;
        }
    }
    
    /**
     * JWT 토큰 검증
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
}

