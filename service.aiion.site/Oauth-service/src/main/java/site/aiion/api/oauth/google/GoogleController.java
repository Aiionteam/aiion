package site.aiion.api.oauth.google;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.view.RedirectView;
import site.aiion.api.oauth.token.TokenService;
import site.aiion.api.oauth.util.JwtUtil;
import site.aiion.api.oauth.util.JwtTokenProvider;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/google")
public class GoogleController {
    
    private final TokenService tokenService;
    private final GoogleOAuthService googleOAuthService;
    private final JwtTokenProvider jwtTokenProvider;
    private final site.aiion.api.oauth.user.UserServiceClient userServiceClient;
    
    public GoogleController(
            TokenService tokenService,
            GoogleOAuthService googleOAuthService,
            JwtTokenProvider jwtTokenProvider,
            site.aiion.api.oauth.user.UserServiceClient userServiceClient) {
        this.tokenService = tokenService;
        this.googleOAuthService = googleOAuthService;
        this.jwtTokenProvider = jwtTokenProvider;
        this.userServiceClient = userServiceClient;
    }
    
    /**
     * 구글 인증 URL 제공
     * 프론트엔드에서 CLIENT ID를 노출하지 않고 인증 URL을 가져올 수 있도록 함
     */
    @GetMapping("/auth-url")
    public ResponseEntity<Map<String, Object>> getGoogleAuthUrl(
            @RequestParam(required = false) String frontend_url,
            HttpServletRequest request) {
        // 환경 변수에서 가져오기
        String clientId = System.getenv("GOOGLE_CLIENT_ID");
        String redirectUri = System.getenv("GOOGLE_REDIRECT_URI");
        
        // 프론트엔드 URL 확인 (파라미터 또는 Referer 헤더 또는 환경변수)
        if (frontend_url == null || frontend_url.isEmpty()) {
            String referer = request.getHeader("Referer");
            if (referer != null && !referer.isEmpty()) {
                // Referer에서 origin 추출 (예: http://localhost:3000)
                try {
                    java.net.URL refererUrl = new java.net.URL(referer);
                    frontend_url = refererUrl.getProtocol() + "://" + refererUrl.getAuthority();
                } catch (Exception e) {
                    // 파싱 실패 시 무시
                }
            }
        }
        
        // 여전히 없으면 환경변수나 기본값 사용
        if (frontend_url == null || frontend_url.isEmpty()) {
            frontend_url = System.getenv("FRONTEND_URL");
            if (frontend_url == null || frontend_url.isEmpty()) {
                frontend_url = "http://localhost:3000";
            }
        }
        
        String csrfToken = UUID.randomUUID().toString(); // CSRF 방지용 토큰
        // State에 프론트엔드 URL과 CSRF 토큰을 인코딩: "frontend_url|csrf_token"
        String state = URLEncoder.encode(frontend_url, StandardCharsets.UTF_8) + "|" + csrfToken;
        
        String authUrl = String.format(
            "https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=%s&redirect_uri=%s&scope=openid%%20profile%%20email&state=%s",
            clientId,
            URLEncoder.encode(redirectUri, StandardCharsets.UTF_8),
            URLEncoder.encode(state, StandardCharsets.UTF_8)
        );
        
        return ResponseEntity.ok(Map.of(
            "success", true,
            "auth_url", authUrl
        ));
    }
    
    /**
     * 구글 인증 콜백 처리
     * Authorization Code를 받아서 바로 토큰 교환 및 JWT 생성 후 프론트엔드로 리다이렉트
     */
    @GetMapping("/callback")
    public RedirectView googleCallback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String error,
            @RequestParam(required = false) String error_description) {
        
        System.out.println("=== 구글 콜백 요청 수신 ===");
        System.out.println("Code: " + code);
        System.out.println("State: " + state);
        System.out.println("Error: " + error);
        System.out.println("Error Description: " + error_description);
        System.out.println("============================");
        
        // State에서 프론트엔드 URL 추출
        String frontendUrl = null;
        if (state != null && !state.isEmpty()) {
            try {
                // State 형식: "frontend_url|csrf_token" 또는 단순 URL
                String decodedState = java.net.URLDecoder.decode(state, StandardCharsets.UTF_8);
                if (decodedState.contains("|")) {
                    // "frontend_url|csrf_token" 형식인 경우
                    String[] parts = decodedState.split("\\|", 2);
                    if (parts.length > 0 && !parts[0].isEmpty()) {
                        frontendUrl = parts[0];
                    }
                } else {
                    // 단순 URL인 경우 (하위 호환성)
                    frontendUrl = decodedState;
                }
            } catch (Exception e) {
                System.err.println("State 파싱 오류: " + e.getMessage());
            }
        }
        
        // State에서 프론트엔드 URL을 추출하지 못한 경우 기본값 사용
        if (frontendUrl == null || frontendUrl.isEmpty()) {
            frontendUrl = System.getenv("FRONTEND_URL");
            if (frontendUrl == null || frontendUrl.isEmpty()) {
                frontendUrl = "http://localhost:3000";
            }
        }
        
        System.out.println("프론트엔드 리다이렉트 URL: " + frontendUrl);
        
        if (code != null) {
            try {
                // 1. Authorization Code를 Access Token으로 교환
                Map<String, Object> tokenResponse = googleOAuthService.getAccessToken(code);
                String accessToken = (String) tokenResponse.get("access_token");
                String refreshToken = (String) tokenResponse.get("refresh_token");
                
                if (accessToken == null) {
                    throw new RuntimeException("구글 Access Token을 받을 수 없습니다.");
                }
                
                // 2. Access Token으로 사용자 정보 조회
                Map<String, Object> userInfo = googleOAuthService.getUserInfo(accessToken);
                Map<String, Object> extractedUserInfo = googleOAuthService.extractUserInfo(userInfo);
                
                // 3. User 테이블에서 사용자 조회 또는 생성
                // 간단한 로직: 있으면 통과, 없으면 생성
                String email = (String) extractedUserInfo.get("email");
                String name = (String) extractedUserInfo.get("nickname");
                String providerId = (String) extractedUserInfo.get("google_id");
                
                // 1단계: 사용자 조회
                site.aiion.api.oauth.user.UserResponse user = userServiceClient.findByEmailAndProvider(email, "google");
                
                // 2단계: 없으면 생성
                if (user == null) {
                    System.out.println("[GoogleController] 사용자 없음, 새로 생성 시도: " + email);
                    user = userServiceClient.saveUser(name, email, "google", providerId);
                    
                    // 3단계: 생성 실패 시 (중복 키 등으로 이미 생성됨) 다시 조회
                    if (user == null) {
                        System.out.println("[GoogleController] 사용자 생성 실패 (중복 가능), 재조회: " + email);
                        user = userServiceClient.findByEmailAndProvider(email, "google");
                    }
                    
                    // 최종 확인: 그래도 없으면 에러
                    if (user == null || user.getId() == null) {
                        throw new RuntimeException("사용자 생성 및 조회 실패 - user-service와 통신에 문제가 있습니다. email: " + email);
                    }
                    System.out.println("[GoogleController] 사용자 처리 완료: ID=" + user.getId() + ", email=" + email);
                } else {
                    System.out.println("[GoogleController] 기존 사용자 조회 성공: ID=" + user.getId() + ", email=" + email);
                }
                
                // 4. JWT 토큰 생성 (User 테이블의 ID 사용)
                Long appUserId = user.getId();
                extractedUserInfo.put("app_user_id", appUserId); // 내부 ID를 클레임에 추가
                String jwtAccessToken = jwtTokenProvider.generateAccessToken(String.valueOf(appUserId), "google", extractedUserInfo);
                String jwtRefreshToken = jwtTokenProvider.generateRefreshToken(String.valueOf(appUserId), "google");
                
                // 5. Redis에 토큰 저장 (User 테이블의 ID 사용)
                tokenService.saveAccessToken("google", String.valueOf(appUserId), jwtAccessToken, 3600);
                tokenService.saveRefreshToken("google", String.valueOf(appUserId), jwtRefreshToken, 2592000);
                
                // 5. 프론트엔드로 리다이렉트 (JWT 토큰 포함)
                String redirectUrl = frontendUrl + "/login/callback?provider=google&token=" + URLEncoder.encode(jwtAccessToken, StandardCharsets.UTF_8);
                if (jwtRefreshToken != null) {
                    redirectUrl += "&refresh_token=" + URLEncoder.encode(jwtRefreshToken, StandardCharsets.UTF_8);
                }
                
                System.out.println("JWT 토큰 생성 완료, 프론트엔드로 리다이렉트: " + redirectUrl);
                return new RedirectView(redirectUrl);
                
            } catch (Exception e) {
                System.err.println("구글 인증 처리 중 오류 발생: " + e.getMessage());
                e.printStackTrace();
                
                // 에러 발생 시 프론트엔드로 리다이렉트
                String redirectUrl = frontendUrl + "/login/callback?provider=google&error=" + URLEncoder.encode("인증 처리 중 오류가 발생했습니다: " + e.getMessage(), StandardCharsets.UTF_8);
                return new RedirectView(redirectUrl);
            }
        } else if (error != null) {
            // 에러 시 프론트엔드로 리다이렉트 (에러 정보 포함)
            String redirectUrl = frontendUrl + "/login/callback?provider=google&error=" + URLEncoder.encode(error, StandardCharsets.UTF_8);
            if (error_description != null) {
                redirectUrl += "&error_description=" + URLEncoder.encode(error_description, StandardCharsets.UTF_8);
            }
            
            System.out.println("에러 발생, 프론트엔드로 리다이렉트: " + redirectUrl);
            return new RedirectView(redirectUrl);
        } else {
            // 인증 코드가 없는 경우
            String redirectUrl = frontendUrl + "/login/callback?provider=google&error=" + URLEncoder.encode("인증 코드가 없습니다.", StandardCharsets.UTF_8);
            System.out.println("인증 코드 없음, 프론트엔드로 리다이렉트: " + redirectUrl);
            return new RedirectView(redirectUrl);
        }
    }
    
    /**
     * 구글 로그인 요청 처리
     * Next.js에서 성공으로 인식하도록 항상 성공 응답 반환
     */
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> googleLogin(
            @RequestBody(required = false) Map<String, Object> request,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest httpRequest) {
        System.out.println("=== 구글 로그인 요청 수신 ===");
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
        response.put("message", "구글 로그인이 성공적으로 처리되었습니다.");
        response.put("token", "mock_token_" + System.currentTimeMillis());
        
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }
    
    /**
     * 구글 토큰 검증 및 저장
     * Authorization Code를 Access Token으로 교환하고 Redis에 저장
     */
    @PostMapping("/token")
    public ResponseEntity<Map<String, Object>> googleToken(@RequestBody(required = false) Map<String, Object> request) {
        System.out.println("=== 구글 토큰 요청 수신 ===");
        System.out.println("Request Body: " + request);
        System.out.println("============================");
        
        Map<String, Object> response = new HashMap<>();
        
        if (request == null || !request.containsKey("code")) {
            response.put("success", false);
            response.put("message", "Authorization Code가 필요합니다.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
        
        String code = request.get("code").toString();
        String requestState = request.containsKey("state") ? request.get("state").toString() : null;
        
        // Redis에서 Authorization Code 검증
        String savedState = tokenService.verifyAndDeleteAuthorizationCode("google", code);
        if (savedState == null) {
            response.put("success", false);
            response.put("message", "유효하지 않거나 만료된 Authorization Code입니다.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
        
        // State 검증 (있는 경우)
        if (requestState != null && !requestState.equals(savedState)) {
            response.put("success", false);
            response.put("message", "State 값이 일치하지 않습니다.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
        
        // TODO: 실제 구글 OAuth2 API를 호출하여 Access Token 교환
        // 현재는 Mock 응답
        String accessToken = "mock_access_token_" + System.currentTimeMillis();
        String refreshToken = "mock_refresh_token_" + System.currentTimeMillis();
        String userId = "mock_google_user_id"; // 실제로는 구글 API에서 받아온 사용자 ID
        
        // Redis에 토큰 저장 (Access Token: 1시간, Refresh Token: 30일)
        tokenService.saveAccessToken("google", userId, accessToken, 3600);
        tokenService.saveRefreshToken("google", userId, refreshToken, 2592000);
        
        response.put("success", true);
        response.put("message", "구글 토큰이 성공적으로 처리되었습니다.");
        response.put("access_token", accessToken);
        response.put("refresh_token", refreshToken);
        response.put("user_id", userId);
        
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }
    
    /**
     * 구글 사용자 정보 조회
     * Next.js에서 성공으로 인식하도록 항상 성공 응답 반환
     */
    @GetMapping("/user")
    public ResponseEntity<Map<String, Object>> googleUserInfo(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest request) {
        System.out.println("=== 구글 사용자 정보 조회 요청 수신 ===");
        
        // Authorization 헤더에서 토큰 출력 및 JWT 파싱
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
        response.put("message", "구글 사용자 정보를 성공적으로 조회했습니다.");
        
        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("id", "mock_google_user_id");
        userInfo.put("nickname", "구글 사용자");
        userInfo.put("email", "google@example.com");
        
        response.put("user", userInfo);
        
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }
    
    /**
     * 모든 구글 관련 요청에 대한 기본 핸들러
     * Next.js에서 성공으로 인식하도록 항상 성공 응답 반환
     */
    @RequestMapping(value = "/**", method = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE})
    public ResponseEntity<Map<String, Object>> googleDefault() {
        System.out.println("=== 구글 기본 핸들러 요청 수신 ===");
        System.out.println("============================");
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "구글 요청이 성공적으로 처리되었습니다.");
        
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }
}
