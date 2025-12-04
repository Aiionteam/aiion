package site.hohyun.api.token;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
public class TokenService {
    
    private final RedisTemplate<String, Object> redisTemplate;
    
    public TokenService(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }
    
    /**
     * Access Token 저장
     * @param provider 소셜 로그인 제공자 (kakao, naver, google)
     * @param userId 사용자 ID
     * @param accessToken Access Token
     * @param expireTime 만료 시간 (초)
     */
    public void saveAccessToken(String provider, String userId, String accessToken, long expireTime) {
        String key = String.format("token:%s:%s:access", provider, userId);
        redisTemplate.opsForValue().set(key, accessToken, expireTime, TimeUnit.SECONDS);
        System.out.println("Redis 저장 - Key: " + key + ", TTL: " + expireTime + "초");
    }
    
    /**
     * Refresh Token 저장
     * @param provider 소셜 로그인 제공자 (kakao, naver, google)
     * @param userId 사용자 ID
     * @param refreshToken Refresh Token
     * @param expireTime 만료 시간 (초)
     */
    public void saveRefreshToken(String provider, String userId, String refreshToken, long expireTime) {
        String key = String.format("token:%s:%s:refresh", provider, userId);
        redisTemplate.opsForValue().set(key, refreshToken, expireTime, TimeUnit.SECONDS);
        System.out.println("Redis 저장 - Key: " + key + ", TTL: " + expireTime + "초");
    }
    
    /**
     * Access Token 조회
     * @param provider 소셜 로그인 제공자
     * @param userId 사용자 ID
     * @return Access Token
     */
    public String getAccessToken(String provider, String userId) {
        String key = String.format("token:%s:%s:access", provider, userId);
        Object token = redisTemplate.opsForValue().get(key);
        return token != null ? token.toString() : null;
    }
    
    /**
     * Refresh Token 조회
     * @param provider 소셜 로그인 제공자
     * @param userId 사용자 ID
     * @return Refresh Token
     */
    public String getRefreshToken(String provider, String userId) {
        String key = String.format("token:%s:%s:refresh", provider, userId);
        Object token = redisTemplate.opsForValue().get(key);
        return token != null ? token.toString() : null;
    }
    
    /**
     * 토큰 삭제
     * @param provider 소셜 로그인 제공자
     * @param userId 사용자 ID
     */
    public void deleteTokens(String provider, String userId) {
        String accessKey = String.format("token:%s:%s:access", provider, userId);
        String refreshKey = String.format("token:%s:%s:refresh", provider, userId);
        redisTemplate.delete(accessKey);
        redisTemplate.delete(refreshKey);
    }
    
    /**
     * Authorization Code 저장 (임시 저장용)
     * @param provider 소셜 로그인 제공자
     * @param code Authorization Code
     * @param expireTime 만료 시간 (초, 기본 10분)
     */
    public void saveAuthorizationCode(String provider, String code, String state, long expireTime) {
        String key = String.format("code:%s:%s", provider, code);
        redisTemplate.opsForValue().set(key, state != null ? state : "", expireTime, TimeUnit.SECONDS);
    }
    
    /**
     * Authorization Code 검증 및 삭제
     * @param provider 소셜 로그인 제공자
     * @param code Authorization Code
     * @return state 값 (있으면 반환, 없으면 null)
     */
    public String verifyAndDeleteAuthorizationCode(String provider, String code) {
        String key = String.format("code:%s:%s", provider, code);
        Object state = redisTemplate.opsForValue().get(key);
        if (state != null) {
            redisTemplate.delete(key);
            return state.toString();
        }
        return null;
    }
}

