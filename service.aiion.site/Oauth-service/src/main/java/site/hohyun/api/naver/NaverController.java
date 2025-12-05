package site.hohyun.api.naver;

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
@RequestMapping("/naver")
public class NaverController {
    
    private final TokenService tokenService;
    private final NaverOAuthService naverOAuthService;
    private final JwtTokenProvider jwtTokenProvider;
    private final site.hohyun.api.user.UserServiceClient userServiceClient;
    
    public NaverController(
            TokenService tokenService,
            NaverOAuthService naverOAuthService,
            JwtTokenProvider jwtTokenProvider,
            site.hohyun.api.user.UserServiceClient userServiceClient) {
        this.tokenService = tokenService;
        this.naverOAuthService = naverOAuthService;
        this.jwtTokenProvider = jwtTokenProvider;
        this.userServiceClient = userServiceClient;
    }
    
    /**
     * 네이버 인증 URL 제공
     * 프론트엔드에서 CLIENT ID를 노출하지 않고 인증 URL을 가져올 수 있도록 함
     */
    @GetMapping("/auth-url")
    public ResponseEntity<Map<String, Object>> getNaverAuthUrl() {
        System.out.println("=== 네이버 인증 URL 요청 ===");
        
        // 환경 변수에서 가져오기
        String clientId = System.getenv("NAVER_CLIENT_ID");
        String redirectUri = System.getenv("NAVER_REDIRECT_URI");
        
        if (clientId == null || clientId.isEmpty()) {
            System.err.println("경고: NAVER_CLIENT_ID가 설정되지 않았습니다.");
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "네이버 CLIENT ID가 설정되지 않았습니다.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
        
        if (redirectUri == null || redirectUri.isEmpty()) {
            System.err.println("경고: NAVER_REDIRECT_URI가 설정되지 않았습니다.");
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "네이버 리다이렉트 URI가 설정되지 않았습니다.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
        
        String encodedRedirectUri = URLEncoder.encode(redirectUri, StandardCharsets.UTF_8);
        String authUrl = String.format(
            "https://nid.naver.com/oauth2.0/authorize?client_id=%s&redirect_uri=%s&response_type=code&state=STATE_STRING",
            clientId,
            encodedRedirectUri
        );
        
        System.out.println("네이버 인증 URL 생성 완료");
        System.out.println("============================");
        
        return ResponseEntity.ok(Map.of(
            "success", true,
            "auth_url", authUrl
        ));
    }
    
    /**
     * 네이버 인증 콜백 처리
     * OAuth2 표준 경로 /login/oauth2/code/naver는 Gateway에서 /naver/callback으로 리라이트됨
     * Authorization Code를 받아서 바로 토큰 교환 및 JWT 생성 후 프론트엔드로 리다이렉트
     */
    @GetMapping("/callback")
    public RedirectView naverCallback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String error,
            @RequestParam(required = false) String error_description) {
        
        System.out.println("=== 네이버 콜백 요청 수신 ===");
        System.out.println("Code: " + code);
        System.out.println("State: " + state);
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
                Map<String, Object> tokenResponse = naverOAuthService.getAccessToken(code, state);
                String accessToken = (String) tokenResponse.get("access_token");
                String refreshToken = (String) tokenResponse.get("refresh_token");
                
                if (accessToken == null) {
                    throw new RuntimeException("네이버 Access Token을 받을 수 없습니다.");
                }
                
                // 2. Access Token으로 사용자 정보 조회
                Map<String, Object> userInfo = naverOAuthService.getUserInfo(accessToken);
                Map<String, Object> extractedUserInfo = naverOAuthService.extractUserInfo(userInfo);
                
                // 3. User 테이블에서 사용자 조회 또는 생성
                // 간단한 로직: 있으면 통과, 없으면 생성
                String email = (String) extractedUserInfo.get("email");
                String name = (String) extractedUserInfo.get("nickname");
                String providerId = (String) extractedUserInfo.get("naver_id");
                
                // 1단계: 사용자 조회
                site.hohyun.api.user.UserResponse user = userServiceClient.findByEmailAndProvider(email, "naver");
                
                // 2단계: 없으면 생성
                if (user == null) {
                    System.out.println("[NaverController] 사용자 없음, 새로 생성 시도: " + email);
                    user = userServiceClient.saveUser(name, email, "naver", providerId);
                    
                    // 3단계: 생성 실패 시 (중복 키 등으로 이미 생성됨) 다시 조회
                    if (user == null) {
                        System.out.println("[NaverController] 사용자 생성 실패 (중복 가능), 재조회: " + email);
                        user = userServiceClient.findByEmailAndProvider(email, "naver");
                    }
                    
                    // 최종 확인: 그래도 없으면 에러
                    if (user == null || user.getId() == null) {
                        throw new RuntimeException("사용자 생성 및 조회 실패 - user-service와 통신에 문제가 있습니다. email: " + email);
                    }
                    System.out.println("[NaverController] 사용자 처리 완료: ID=" + user.getId() + ", email=" + email);
                } else {
                    System.out.println("[NaverController] 기존 사용자 조회 성공: ID=" + user.getId() + ", email=" + email);
                }
                
                // 4. JWT 토큰 생성 (User 테이블의 ID 사용)
                Long appUserId = user.getId();
                extractedUserInfo.put("app_user_id", appUserId); // 내부 ID를 클레임에 추가
                String jwtAccessToken = jwtTokenProvider.generateAccessToken(String.valueOf(appUserId), "naver", extractedUserInfo);
                String jwtRefreshToken = jwtTokenProvider.generateRefreshToken(String.valueOf(appUserId), "naver");
                
                // 5. Redis에 토큰 저장 (User 테이블의 ID 사용)
                tokenService.saveAccessToken("naver", String.valueOf(appUserId), jwtAccessToken, 3600);
                tokenService.saveRefreshToken("naver", String.valueOf(appUserId), jwtRefreshToken, 2592000);
                
                // 5. 프론트엔드로 리다이렉트 (JWT 토큰 포함)
                String redirectUrl = frontendUrl + "/login/callback?provider=naver&token=" + URLEncoder.encode(jwtAccessToken, StandardCharsets.UTF_8);
                if (jwtRefreshToken != null) {
                    redirectUrl += "&refresh_token=" + URLEncoder.encode(jwtRefreshToken, StandardCharsets.UTF_8);
                }
                
                System.out.println("JWT 토큰 생성 완료, 프론트엔드로 리다이렉트: " + redirectUrl);
                return new RedirectView(redirectUrl);
                
            } catch (Exception e) {
                System.err.println("네이버 인증 처리 중 오류 발생: " + e.getMessage());
                e.printStackTrace();
                
                // 에러 발생 시 프론트엔드로 리다이렉트
                String redirectUrl = frontendUrl + "/login/callback?provider=naver&error=" + URLEncoder.encode("인증 처리 중 오류가 발생했습니다: " + e.getMessage(), StandardCharsets.UTF_8);
                return new RedirectView(redirectUrl);
            }
        } else if (error != null) {
            // 에러 시 프론트엔드로 리다이렉트 (에러 정보 포함)
            String redirectUrl = frontendUrl + "/login/callback?provider=naver&error=" + URLEncoder.encode(error, StandardCharsets.UTF_8);
            if (error_description != null) {
                redirectUrl += "&error_description=" + URLEncoder.encode(error_description, StandardCharsets.UTF_8);
            }
            
            System.out.println("에러 발생, 프론트엔드로 리다이렉트: " + redirectUrl);
            return new RedirectView(redirectUrl);
        } else {
            // 인증 코드가 없는 경우
            String redirectUrl = frontendUrl + "/login/callback?provider=naver&error=" + URLEncoder.encode("인증 코드가 없습니다.", StandardCharsets.UTF_8);
            System.out.println("인증 코드 없음, 프론트엔드로 리다이렉트: " + redirectUrl);
            return new RedirectView(redirectUrl);
        }
    }
    
    /**
     * 네이버 로그인 요청 처리
     * Next.js에서 성공으로 인식하도록 항상 성공 응답 반환
     */
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> naverLogin(
            @RequestBody(required = false) Map<String, Object> request,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest httpRequest) {
        System.out.println("=== 네이버 로그인 요청 수신 ===");
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
        response.put("message", "네이버 로그인이 성공적으로 처리되었습니다.");
        response.put("token", "mock_token_" + System.currentTimeMillis());
        
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }
    
    /**
     * 네이버 토큰 검증 및 저장
     * Authorization Code를 Access Token으로 교환하고 Redis에 저장
     */
    @PostMapping("/token")
    public ResponseEntity<Map<String, Object>> naverToken(@RequestBody(required = false) Map<String, Object> request) {
        System.out.println("=== 네이버 토큰 요청 수신 ===");
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
        String savedState = tokenService.verifyAndDeleteAuthorizationCode("naver", code);
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
        
        // TODO: 실제 네이버 OAuth2 API를 호출하여 Access Token 교환
        // 현재는 Mock 응답
        String accessToken = "mock_access_token_" + System.currentTimeMillis();
        String refreshToken = "mock_refresh_token_" + System.currentTimeMillis();
        String userId = "mock_naver_user_id"; // 실제로는 네이버 API에서 받아온 사용자 ID
        
        // Redis에 토큰 저장 (Access Token: 1시간, Refresh Token: 30일)
        tokenService.saveAccessToken("naver", userId, accessToken, 3600);
        tokenService.saveRefreshToken("naver", userId, refreshToken, 2592000);
        
        response.put("success", true);
        response.put("message", "네이버 토큰이 성공적으로 처리되었습니다.");
        response.put("access_token", accessToken);
        response.put("refresh_token", refreshToken);
        response.put("user_id", userId);
        
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }
    
    /**
     * 네이버 사용자 정보 조회
     * Next.js에서 성공으로 인식하도록 항상 성공 응답 반환
     */
    @GetMapping("/user")
    public ResponseEntity<Map<String, Object>> naverUserInfo(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest request) {
        System.out.println("=== 네이버 사용자 정보 조회 요청 수신 ===");
        
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
        response.put("message", "네이버 사용자 정보를 성공적으로 조회했습니다.");
        
        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("id", "mock_naver_user_id");
        userInfo.put("nickname", "네이버 사용자");
        userInfo.put("email", "naver@example.com");
        
        response.put("user", userInfo);
        
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }
    
    /**
     * 모든 네이버 관련 요청에 대한 기본 핸들러
     * Next.js에서 성공으로 인식하도록 항상 성공 응답 반환
     */
    @RequestMapping(value = "/**", method = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE})
    public ResponseEntity<Map<String, Object>> naverDefault() {
        System.out.println("=== 네이버 기본 핸들러 요청 수신 ===");
        System.out.println("============================");
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "네이버 요청이 성공적으로 처리되었습니다.");
        
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }
}

