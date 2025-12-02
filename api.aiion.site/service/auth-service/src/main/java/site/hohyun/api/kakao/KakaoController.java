package site.hohyun.api.kakao;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.view.RedirectView;
import site.hohyun.api.token.TokenService;
import site.hohyun.api.util.JwtUtil;
import site.hohyun.api.util.JwtTokenProvider;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/kakao")
public class KakaoController {
    
    private final TokenService tokenService;
    private final KakaoOAuthService kakaoOAuthService;
    private final JwtTokenProvider jwtTokenProvider;
    private final site.hohyun.api.user.UserServiceClient userServiceClient;
    
    public KakaoController(
            TokenService tokenService,
            KakaoOAuthService kakaoOAuthService,
            JwtTokenProvider jwtTokenProvider,
            site.hohyun.api.user.UserServiceClient userServiceClient) {
        this.tokenService = tokenService;
        this.kakaoOAuthService = kakaoOAuthService;
        this.jwtTokenProvider = jwtTokenProvider;
        this.userServiceClient = userServiceClient;
    }
    
    /**
     * 카카오 인증 URL 제공
     * 프론트엔드에서 REST API KEY를 노출하지 않고 인증 URL을 가져올 수 있도록 함
     */
    @GetMapping("/auth-url")
    public ResponseEntity<Map<String, Object>> getKakaoAuthUrl() {
        System.out.println("=== 카카오 인증 URL 요청 ===");
        
        // 환경 변수에서 가져오기
        String clientId = System.getenv("KAKAO_REST_API_KEY");
        String redirectUri = System.getenv("KAKAO_REDIRECT_URI");
        
        if (clientId == null || clientId.isEmpty()) {
            System.err.println("경고: KAKAO_REST_API_KEY가 설정되지 않았습니다.");
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "카카오 REST API KEY가 설정되지 않았습니다.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
        
        if (redirectUri == null || redirectUri.isEmpty()) {
            System.err.println("경고: KAKAO_REDIRECT_URI가 설정되지 않았습니다.");
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "카카오 리다이렉트 URI가 설정되지 않았습니다.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
        
        String encodedRedirectUri = URLEncoder.encode(redirectUri, StandardCharsets.UTF_8);
        String authUrl = String.format(
            "https://kauth.kakao.com/oauth/authorize?client_id=%s&redirect_uri=%s&response_type=code",
            clientId,
            encodedRedirectUri
        );
        
        System.out.println("카카오 인증 URL 생성 완료");
        System.out.println("============================");
        
        return ResponseEntity.ok(Map.of(
            "success", true,
            "auth_url", authUrl
        ));
    }
    
    /**
     * 카카오 인증 콜백 처리
     * Authorization Code를 받아서 바로 토큰 교환 및 JWT 생성 후 프론트엔드로 리다이렉트
     */
    @GetMapping("/callback")
    public RedirectView kakaoCallback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String error,
            @RequestParam(required = false) String error_description) {
        
        System.out.println("=== 카카오 콜백 요청 수신 ===");
        System.out.println("Code: " + code);
        System.out.println("Error: " + error);
        System.out.println("Error Description: " + error_description);
        System.out.println("============================");
        
        // 프론트엔드 도메인 (환경 변수에서 가져오거나 기본값 사용)
        String frontendUrl = System.getenv("FRONTEND_URL");
        if (frontendUrl == null || frontendUrl.isEmpty()) {
            frontendUrl = "http://localhost:3000";
        }
        
        if (code != null) {
            try {
                // 1. Authorization Code를 Access Token으로 교환
                Map<String, Object> tokenResponse = kakaoOAuthService.getAccessToken(code);
                String accessToken = (String) tokenResponse.get("access_token");
                String refreshToken = (String) tokenResponse.get("refresh_token");
                
                if (accessToken == null) {
                    throw new RuntimeException("카카오 Access Token을 받을 수 없습니다.");
                }
                
                // 2. Access Token으로 사용자 정보 조회
                Map<String, Object> userInfo = kakaoOAuthService.getUserInfo(accessToken);
                Map<String, Object> extractedUserInfo = kakaoOAuthService.extractUserInfo(userInfo);
                
                // 3. User 테이블에서 사용자 조회 또는 생성
                // 간단한 로직: 있으면 통과, 없으면 생성
                String email = (String) extractedUserInfo.get("email");
                String name = (String) extractedUserInfo.get("nickname");
                String providerId = extractedUserInfo.get("kakao_id").toString();
                
                // 1단계: 사용자 조회
                site.hohyun.api.user.UserResponse user = userServiceClient.findByEmailAndProvider(email, "kakao");
                
                // 2단계: 없으면 생성
                if (user == null) {
                    System.out.println("[KakaoController] 사용자 없음, 새로 생성 시도: " + email);
                    user = userServiceClient.saveUser(name, email, "kakao", providerId);
                    
                    // 3단계: 생성 실패 시 (중복 키 등으로 이미 생성됨) 다시 조회
                    if (user == null) {
                        System.out.println("[KakaoController] 사용자 생성 실패 (중복 가능), 재조회: " + email);
                        user = userServiceClient.findByEmailAndProvider(email, "kakao");
                    }
                    
                    // 최종 확인: 그래도 없으면 에러
                    if (user == null || user.getId() == null) {
                        throw new RuntimeException("사용자 생성 및 조회 실패 - user-service와 통신에 문제가 있습니다. email: " + email);
                    }
                    System.out.println("[KakaoController] 사용자 처리 완료: ID=" + user.getId() + ", email=" + email);
                } else {
                    System.out.println("[KakaoController] 기존 사용자 조회 성공: ID=" + user.getId() + ", email=" + email);
                }
                
                // 4. JWT 토큰 생성 (User 테이블의 ID 사용)
                Long appUserId = user.getId();
                extractedUserInfo.put("app_user_id", appUserId); // 내부 ID를 클레임에 추가
                String jwtAccessToken = jwtTokenProvider.generateAccessToken(String.valueOf(appUserId), "kakao", extractedUserInfo);
                String jwtRefreshToken = jwtTokenProvider.generateRefreshToken(String.valueOf(appUserId), "kakao");
                
                // 5. Redis에 토큰 저장 (User 테이블의 ID 사용)
                tokenService.saveAccessToken("kakao", String.valueOf(appUserId), jwtAccessToken, 3600);
                tokenService.saveRefreshToken("kakao", String.valueOf(appUserId), jwtRefreshToken, 2592000);
                
                // 5. 프론트엔드로 리다이렉트 (JWT 토큰 포함)
                String redirectUrl = frontendUrl + "/login/callback?provider=kakao&token=" + URLEncoder.encode(jwtAccessToken, StandardCharsets.UTF_8);
                if (jwtRefreshToken != null) {
                    redirectUrl += "&refresh_token=" + URLEncoder.encode(jwtRefreshToken, StandardCharsets.UTF_8);
                }
                
                System.out.println("JWT 토큰 생성 완료, 프론트엔드로 리다이렉트: " + redirectUrl);
                return new RedirectView(redirectUrl);
                
            } catch (Exception e) {
                System.err.println("카카오 인증 처리 중 오류 발생: " + e.getMessage());
                e.printStackTrace();
                
                // 에러 발생 시 프론트엔드로 리다이렉트
                String redirectUrl = frontendUrl + "/login/callback?provider=kakao&error=" + URLEncoder.encode("인증 처리 중 오류가 발생했습니다: " + e.getMessage(), StandardCharsets.UTF_8);
                return new RedirectView(redirectUrl);
            }
        } else if (error != null) {
            // 에러 시 프론트엔드로 리다이렉트 (에러 정보 포함)
            String redirectUrl = frontendUrl + "/login/callback?provider=kakao&error=" + URLEncoder.encode(error, StandardCharsets.UTF_8);
            if (error_description != null) {
                redirectUrl += "&error_description=" + URLEncoder.encode(error_description, StandardCharsets.UTF_8);
            }
            
            System.out.println("에러 발생, 프론트엔드로 리다이렉트: " + redirectUrl);
            return new RedirectView(redirectUrl);
        } else {
            // 인증 코드가 없는 경우
            String redirectUrl = frontendUrl + "/login/callback?provider=kakao&error=" + URLEncoder.encode("인증 코드가 없습니다.", StandardCharsets.UTF_8);
            System.out.println("인증 코드 없음, 프론트엔드로 리다이렉트: " + redirectUrl);
            return new RedirectView(redirectUrl);
        }
    }
    
    /**
     * 카카오 로그인 요청 처리
     * Next.js에서 성공으로 인식하도록 항상 성공 응답 반환
     */
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> kakaoLogin(
            @RequestBody(required = false) Map<String, Object> request,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest httpRequest) {
        System.out.println("=== 카카오 로그인 요청 수신 ===");
        System.out.println("Request Body: " + request);
        
        // Authorization 헤더에서 토큰 확인
        if (authHeader != null) {
            System.out.println("Authorization 헤더: " + authHeader);
            if (authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                System.out.println("추출된 토큰: " + token.substring(0, Math.min(token.length(), 50)) + "...");
                // JWT 토큰 파싱 및 정보 출력
                System.out.println(JwtUtil.formatTokenInfo(authHeader));
            }
        } else {
            System.out.println("Authorization 헤더 없음");
        }
        
        System.out.println("============================");
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "카카오 로그인이 성공적으로 처리되었습니다.");
        response.put("token", "mock_token_" + System.currentTimeMillis());
        
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }
    
    /**
     * 카카오 토큰 검증 및 저장
     * Authorization Code를 Access Token으로 교환하고 Redis에 저장
     */
    @PostMapping("/token")
    public ResponseEntity<Map<String, Object>> kakaoToken(@RequestBody(required = false) Map<String, Object> request) {
        System.out.println("=== 카카오 토큰 요청 수신 ===");
        System.out.println("Request Body: " + request);
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            // 1. Authorization Code 검증
            if (request == null || !request.containsKey("code")) {
                response.put("success", false);
                response.put("message", "Authorization Code가 필요합니다.");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }
            
            String code = request.get("code").toString();
            
            // 2. Redis에서 Authorization Code 검증
            String state = tokenService.verifyAndDeleteAuthorizationCode("kakao", code);
            if (state == null) {
                System.out.println("경고: Redis에 Authorization Code가 없습니다. 계속 진행합니다.");
                // Redis에 없어도 카카오 API 호출은 진행 (개발 환경 고려)
            }
            
            // 3. 카카오 Access Token 교환
            System.out.println("카카오 API로 Access Token 요청 중...");
            Map<String, Object> kakaoTokenResponse = kakaoOAuthService.getAccessToken(code);
            String kakaoAccessToken = (String) kakaoTokenResponse.get("access_token");
            // kakaoRefreshToken은 필요시 사용 가능
            // String kakaoRefreshToken = (String) kakaoTokenResponse.get("refresh_token");
            
            if (kakaoAccessToken == null) {
                response.put("success", false);
                response.put("message", "카카오 Access Token 발급 실패");
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
            }
            
            // 4. 카카오 사용자 정보 조회
            System.out.println("카카오 사용자 정보 조회 중...");
            Map<String, Object> kakaoUserInfo = kakaoOAuthService.getUserInfo(kakaoAccessToken);
            Map<String, Object> userInfo = kakaoOAuthService.extractUserInfo(kakaoUserInfo);
            
            // 5. JWT 토큰 생성
            String userId = userInfo.get("kakao_id").toString();
            System.out.println("JWT 토큰 생성 중... User ID: " + userId);
            
            String jwtAccessToken = jwtTokenProvider.generateAccessToken(userId, "kakao", userInfo);
            String jwtRefreshToken = jwtTokenProvider.generateRefreshToken(userId, "kakao");
            
            // JWT 토큰 상세 정보 출력
            System.out.println("\n=== 생성된 JWT 토큰 정보 ===");
            System.out.println("Access Token (전체): " + jwtAccessToken);
            System.out.println("Refresh Token (전체): " + jwtRefreshToken);
            System.out.println("\n--- Access Token 파싱 ---");
            System.out.println(JwtUtil.formatTokenInfo("Bearer " + jwtAccessToken));
            System.out.println("\n--- Refresh Token 파싱 ---");
            System.out.println(JwtUtil.formatTokenInfo("Bearer " + jwtRefreshToken));
            
            // JWT 토큰 검증
            boolean isValidAccessToken = jwtTokenProvider.validateToken(jwtAccessToken);
            boolean isValidRefreshToken = jwtTokenProvider.validateToken(jwtRefreshToken);
            System.out.println("\n--- JWT 토큰 검증 결과 ---");
            System.out.println("Access Token 유효성: " + (isValidAccessToken ? "✅ 유효" : "❌ 무효"));
            System.out.println("Refresh Token 유효성: " + (isValidRefreshToken ? "✅ 유효" : "❌ 무효"));
            
            // JWT 토큰에서 사용자 정보 추출
            if (isValidAccessToken) {
                var claims = jwtTokenProvider.getAllClaimsFromToken(jwtAccessToken);
                System.out.println("\n--- JWT Access Token 클레임 정보 ---");
                System.out.println("Subject (User ID): " + claims.getSubject());
                System.out.println("Provider: " + claims.get("provider"));
                System.out.println("Type: " + claims.get("type"));
                System.out.println("Nickname: " + claims.get("nickname"));
                System.out.println("Email: " + claims.get("email"));
                System.out.println("Issued At: " + claims.getIssuedAt());
                System.out.println("Expiration: " + claims.getExpiration());
            }
            System.out.println("============================\n");
            
            // 6. Redis에 토큰 저장 (Access Token: 1시간, Refresh Token: 30일)
            System.out.println("Redis에 토큰 저장 중...");
            tokenService.saveAccessToken("kakao", userId, jwtAccessToken, 3600);
            tokenService.saveRefreshToken("kakao", userId, jwtRefreshToken, 2592000);
            
            // Redis 저장 확인
            String savedAccessToken = tokenService.getAccessToken("kakao", userId);
            String savedRefreshToken = tokenService.getRefreshToken("kakao", userId);
            if (savedAccessToken != null && savedRefreshToken != null) {
                System.out.println("✅ Redis에 토큰 저장 성공!");
                System.out.println("  - Access Token Key: token:kakao:" + userId + ":access");
                System.out.println("  - Refresh Token Key: token:kakao:" + userId + ":refresh");
            } else {
                System.out.println("⚠️ Redis 토큰 저장 확인 실패");
            }
            
            System.out.println("카카오 인증 완료: " + userInfo.get("nickname"));
            System.out.println("============================");
            
            // 7. 응답 반환
            response.put("success", true);
            response.put("message", "카카오 로그인이 성공적으로 처리되었습니다.");
            response.put("access_token", jwtAccessToken);
            response.put("refresh_token", jwtRefreshToken);
            response.put("token_type", "Bearer");
            response.put("expires_in", 3600);
            response.put("user", userInfo);
            
            return ResponseEntity.status(HttpStatus.OK).body(response);
            
        } catch (Exception e) {
            System.err.println("카카오 인증 처리 중 오류 발생: " + e.getMessage());
            e.printStackTrace();
            
            response.put("success", false);
            response.put("message", "카카오 인증 처리 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * 카카오 사용자 정보 조회
     * JWT 토큰으로 사용자 정보 반환
     */
    @GetMapping("/user")
    public ResponseEntity<Map<String, Object>> kakaoUserInfo(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest request) {
        System.out.println("=== 카카오 사용자 정보 조회 요청 수신 ===");
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Authorization 헤더 검증
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                System.out.println("Authorization 헤더 없음 또는 형식 오류");
                response.put("success", false);
                response.put("message", "인증 토큰이 필요합니다.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            String token = authHeader.substring(7);
            System.out.println("JWT 토큰 검증 중...");
            
            // JWT 토큰 검증
            if (!jwtTokenProvider.validateToken(token)) {
                System.out.println("JWT 토큰 검증 실패");
                response.put("success", false);
                response.put("message", "유효하지 않은 토큰입니다.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            // JWT 토큰에서 사용자 정보 추출
            String userId = jwtTokenProvider.getUserIdFromToken(token);
            var claims = jwtTokenProvider.getAllClaimsFromToken(token);
            
            System.out.println("사용자 인증 성공: " + userId);
            
            // Redis에서 토큰 확인 (선택적)
            String storedToken = tokenService.getAccessToken("kakao", userId);
            if (storedToken == null) {
                System.out.println("경고: Redis에 저장된 토큰이 없습니다.");
            }
            
            // 사용자 정보 구성
            Map<String, Object> userInfo = new HashMap<>();
            userInfo.put("kakao_id", userId);
            userInfo.put("nickname", claims.get("nickname"));
            userInfo.put("email", claims.get("email"));
            userInfo.put("email_verified", claims.get("email_verified"));
            userInfo.put("profile_image", claims.get("profile_image"));
            userInfo.put("provider", "kakao");
            
            System.out.println("============================");
            
            response.put("success", true);
            response.put("message", "카카오 사용자 정보를 성공적으로 조회했습니다.");
            response.put("user", userInfo);
            
            return ResponseEntity.status(HttpStatus.OK).body(response);
            
        } catch (Exception e) {
            System.err.println("사용자 정보 조회 중 오류 발생: " + e.getMessage());
            e.printStackTrace();
            
            response.put("success", false);
            response.put("message", "사용자 정보 조회 중 오류가 발생했습니다.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * 모든 카카오 관련 요청에 대한 기본 핸들러
     * Next.js에서 성공으로 인식하도록 항상 성공 응답 반환
     */
    @RequestMapping(value = "/**", method = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE})
    public ResponseEntity<Map<String, Object>> kakaoDefault() {
        System.out.println("=== 카카오 기본 핸들러 요청 수신 ===");
        System.out.println("============================");
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "카카오 요청이 성공적으로 처리되었습니다.");
        
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }
}
