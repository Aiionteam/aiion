package site.aiion.api.account.memo;

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
@RequestMapping("/memos")
@Tag(name = "03. Memo", description = "가계부 메모 관리 기능")
public class MemoController {

    private final MemoService memoService;
    private final JwtTokenUtil jwtTokenUtil;

    @PostMapping("/findById")
    @Operation(summary = "메모 ID로 조회", description = "메모 ID를 받아 해당 메모 정보를 조회합니다.")
    public Messenger findById(@RequestBody MemoModel memoModel) {
        return memoService.findById(memoModel);
    }

    @GetMapping("/account/{accountId}")
    @Operation(summary = "계정 ID로 메모 조회", description = "JWT 토큰에서 사용자 ID를 추출하여 특정 계정의 메모를 조회합니다.")
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
        
        return memoService.findByAccountId(accountId, userId);
    }

    @GetMapping("/user")
    @Operation(summary = "JWT 토큰 기반 메모 목록 조회", description = "JWT 토큰에서 사용자 ID를 추출하여 해당 사용자의 모든 메모를 조회합니다.")
    public Messenger findByUserId(
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
        
        return memoService.findByUserId(userId);
    }

    @PostMapping
    @Operation(summary = "메모 저장", description = "새로운 메모를 저장합니다. JWT 토큰에서 userId를 자동으로 추출합니다.")
    public Messenger save(
            @RequestBody MemoModel memoModel,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            log.info("[MemoController] 메모 저장 요청: accountId={}, content={}", 
                    memoModel.getAccountId(), memoModel.getContent());
            
            // JWT 토큰에서 userId 추출 및 설정 (만료된 토큰도 파싱 가능)
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = jwtTokenUtil.extractTokenFromHeader(authHeader);
                if (token != null) {
                    // 검증 없이 userId만 추출 (만료된 토큰도 파싱 가능)
                    Long tokenUserId = jwtTokenUtil.getUserIdFromToken(token);
                    if (tokenUserId != null) {
                        memoModel.setUserId(tokenUserId);
                        log.info("[MemoController] userId 추출 성공: {}", tokenUserId);
                    } else {
                        log.warn("[MemoController] JWT 토큰에서 userId 추출 실패");
                    }
                } else {
                    log.warn("[MemoController] JWT 토큰 추출 실패");
                }
            } else {
                log.warn("[MemoController] Authorization 헤더가 없거나 Bearer 형식이 아님: {}", authHeader);
            }
            
            Messenger result = memoService.save(memoModel);
            log.info("[MemoController] 메모 저장 결과: code={}, message={}", result.getCode(), result.getMessage());
            return result;
        } catch (Exception e) {
            log.error("[MemoController] 메모 저장 중 예외 발생", e);
            return Messenger.builder()
                    .code(500)
                    .message("메모 저장 중 오류가 발생했습니다: " + e.getMessage())
                    .build();
        }
    }

    @PutMapping
    @Operation(summary = "메모 수정", description = "기존 메모를 수정합니다. JWT 토큰에서 userId를 자동으로 추출합니다.")
    public Messenger update(
            @RequestBody MemoModel memoModel,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        // JWT 토큰에서 userId 추출 및 설정
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = jwtTokenUtil.extractTokenFromHeader(authHeader);
            if (token != null && jwtTokenUtil.validateToken(token)) {
                Long tokenUserId = jwtTokenUtil.getUserIdFromToken(token);
                if (tokenUserId != null) {
                    memoModel.setUserId(tokenUserId);
                }
            }
        }
        return memoService.update(memoModel);
    }

    @DeleteMapping
    @Operation(summary = "메모 삭제", description = "메모를 삭제합니다. JWT 토큰에서 userId를 자동으로 추출합니다.")
    public Messenger delete(
            @RequestBody MemoModel memoModel,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        // JWT 토큰에서 userId 추출 및 설정
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = jwtTokenUtil.extractTokenFromHeader(authHeader);
            if (token != null && jwtTokenUtil.validateToken(token)) {
                Long tokenUserId = jwtTokenUtil.getUserIdFromToken(token);
                if (tokenUserId != null) {
                    memoModel.setUserId(tokenUserId);
                }
            }
        }
        return memoService.delete(memoModel);
    }
}

