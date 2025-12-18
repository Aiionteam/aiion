package site.aiion.api.account.alert;

import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import site.aiion.api.account.common.domain.Messenger;
import site.aiion.api.account.util.JwtTokenUtil;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/alerts")
@Tag(name = "04. Alert", description = "가계부 알람 관리 기능")
public class AlertController {

    private final AlertService alertService;
    private final JwtTokenUtil jwtTokenUtil;

    @PostMapping("/findById")
    @Operation(summary = "알람 ID로 조회", description = "알람 ID를 받아 해당 알람 정보를 조회합니다.")
    public Messenger findById(@RequestBody AlertModel alertModel) {
        return alertService.findById(alertModel);
    }

    @GetMapping("/account/{accountId}")
    @Operation(summary = "계정 ID로 알람 조회", description = "JWT 토큰에서 사용자 ID를 추출하여 특정 계정의 알람을 조회합니다.")
    public Messenger findByAccountId(
            @PathVariable Long accountId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        // Authorization 헤더 검증
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return Messenger.builder()
                    .code(401)
                    .message("인증 토큰이 필요합니다.")
                    .build();
        }
        
        // 토큰 추출 및 검증
        String token = jwtTokenUtil.extractTokenFromHeader(authHeader);
        if (token == null || !jwtTokenUtil.validateToken(token)) {
            return Messenger.builder()
                    .code(401)
                    .message("유효하지 않은 토큰입니다.")
                    .build();
        }
        
        // 토큰에서 userId 추출
        Long userId = jwtTokenUtil.getUserIdFromToken(token);
        if (userId == null) {
            return Messenger.builder()
                    .code(401)
                    .message("토큰에서 사용자 ID를 추출할 수 없습니다.")
                    .build();
        }
        
        return alertService.findByAccountId(accountId, userId);
    }

    @GetMapping("/active")
    @Operation(summary = "활성 알람 목록 조회", description = "JWT 토큰에서 사용자 ID를 추출하여 활성화된 알람 목록을 조회합니다.")
    public Messenger findActiveAlarms(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        // Authorization 헤더 검증
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return Messenger.builder()
                    .code(401)
                    .message("인증 토큰이 필요합니다.")
                    .build();
        }
        
        // 토큰 추출 및 검증
        String token = jwtTokenUtil.extractTokenFromHeader(authHeader);
        if (token == null || !jwtTokenUtil.validateToken(token)) {
            return Messenger.builder()
                    .code(401)
                    .message("유효하지 않은 토큰입니다.")
                    .build();
        }
        
        // 토큰에서 userId 추출
        Long userId = jwtTokenUtil.getUserIdFromToken(token);
        if (userId == null) {
            return Messenger.builder()
                    .code(401)
                    .message("토큰에서 사용자 ID를 추출할 수 없습니다.")
                    .build();
        }
        
        return alertService.findActiveAlarmsByUserId(userId);
    }

    @PostMapping
    @Operation(summary = "알람 저장", description = "새로운 알람을 저장합니다. JWT 토큰에서 userId를 자동으로 추출합니다.")
    public Messenger save(
            @RequestBody AlertModel alertModel,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            log.info("[AlertController] 알람 저장 요청: accountId={}, alarmDate={}, alarmTime={}, alarmEnabled={}", 
                    alertModel.getAccountId(), alertModel.getAlarmDate(), alertModel.getAlarmTime(), alertModel.getAlarmEnabled());
            
            // JWT 토큰에서 userId 추출 및 설정 (만료된 토큰도 파싱 가능)
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = jwtTokenUtil.extractTokenFromHeader(authHeader);
                if (token != null) {
                    // 검증 없이 userId만 추출 (만료된 토큰도 파싱 가능)
                    Long tokenUserId = jwtTokenUtil.getUserIdFromToken(token);
                    if (tokenUserId != null) {
                        alertModel.setUserId(tokenUserId);
                        log.info("[AlertController] userId 추출 성공: {}", tokenUserId);
                    } else {
                        log.warn("[AlertController] JWT 토큰에서 userId 추출 실패");
                    }
                } else {
                    log.warn("[AlertController] JWT 토큰 추출 실패");
                }
            } else {
                log.warn("[AlertController] Authorization 헤더가 없거나 Bearer 형식이 아님: {}", authHeader);
            }
            
            // alarmEnabled가 null이면 true로 설정 (알람을 설정하는 것이므로)
            if (alertModel.getAlarmEnabled() == null) {
                alertModel.setAlarmEnabled(true);
            }
            
            Messenger result = alertService.save(alertModel);
            log.info("[AlertController] 알람 저장 결과: code={}, message={}", result.getCode(), result.getMessage());
            return result;
        } catch (Exception e) {
            log.error("[AlertController] 알람 저장 중 예외 발생", e);
            return Messenger.builder()
                    .code(500)
                    .message("알람 저장 중 오류가 발생했습니다: " + e.getMessage())
                    .build();
        }
    }

    @PutMapping
    @Operation(summary = "알람 수정", description = "기존 알람을 수정합니다. JWT 토큰에서 userId를 자동으로 추출합니다.")
    public Messenger update(
            @RequestBody AlertModel alertModel,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        // JWT 토큰에서 userId 추출 및 설정
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = jwtTokenUtil.extractTokenFromHeader(authHeader);
            if (token != null && jwtTokenUtil.validateToken(token)) {
                Long tokenUserId = jwtTokenUtil.getUserIdFromToken(token);
                if (tokenUserId != null) {
                    alertModel.setUserId(tokenUserId);
                }
            }
        }
        return alertService.update(alertModel);
    }

    @DeleteMapping
    @Operation(summary = "알람 삭제", description = "알람을 삭제합니다. JWT 토큰에서 userId를 자동으로 추출합니다.")
    public Messenger delete(
            @RequestBody AlertModel alertModel,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        // JWT 토큰에서 userId 추출 및 설정
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = jwtTokenUtil.extractTokenFromHeader(authHeader);
            if (token != null && jwtTokenUtil.validateToken(token)) {
                Long tokenUserId = jwtTokenUtil.getUserIdFromToken(token);
                if (tokenUserId != null) {
                    alertModel.setUserId(tokenUserId);
                }
            }
        }
        return alertService.delete(alertModel);
    }
}

