package site.aiion.api.account;

import java.util.List;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import site.aiion.api.account.common.domain.Messenger;
import site.aiion.api.account.util.JwtTokenUtil;

@RestController
@RequiredArgsConstructor
@RequestMapping("/accounts")
@Tag(name = "01. Account", description = "가계부 관리 기능")
public class AccountController {

    private final AccountService accountService;
    private final JwtTokenUtil jwtTokenUtil;

    @PostMapping("/findById")
    @Operation(summary = "가계부 ID로 조회", description = "가계부 ID를 받아 해당 가계부 정보를 조회합니다.")
    public Messenger findById(@RequestBody AccountModel accountModel) {
        return accountService.findById(accountModel);
    }

    @GetMapping("/user/{userId}")
    @Operation(summary = "사용자별 가계부 조회 (Deprecated)", description = "특정 사용자의 가계부 정보를 조회합니다. JWT 토큰 기반 조회를 사용하세요.")
    public Messenger findByUserId(
            @org.springframework.web.bind.annotation.PathVariable Long userId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        // JWT 토큰이 있으면 토큰에서 userId 추출 (보안 강화)
        if (authHeader != null) {
            String token = jwtTokenUtil.extractTokenFromHeader(authHeader);
            if (token != null && jwtTokenUtil.validateToken(token)) {
                Long tokenUserId = jwtTokenUtil.getUserIdFromToken(token);
                if (tokenUserId != null) {
                    // 토큰의 userId와 경로의 userId가 일치하는지 확인
                    if (!tokenUserId.equals(userId)) {
                        return Messenger.builder()
                                .Code(403)
                                .message("권한이 없습니다. 토큰의 사용자 ID와 요청한 사용자 ID가 일치하지 않습니다.")
                                .build();
                    }
                }
            }
        }
        return accountService.findByUserId(userId);
    }
    
    @GetMapping("/user")
    @Operation(summary = "JWT 토큰 기반 가계부 조회", description = "JWT 토큰에서 사용자 ID를 추출하여 해당 사용자의 가계부 정보를 조회합니다.")
    public Messenger findByUserIdFromToken(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        // Authorization 헤더 검증
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return Messenger.builder()
                    .Code(401)
                    .message("인증 토큰이 필요합니다.")
                    .build();
        }
        
        // 토큰 추출 및 검증
        String token = jwtTokenUtil.extractTokenFromHeader(authHeader);
        if (token == null || !jwtTokenUtil.validateToken(token)) {
            return Messenger.builder()
                    .Code(401)
                    .message("유효하지 않은 토큰입니다.")
                    .build();
        }
        
        // 토큰에서 userId 추출
        Long userId = jwtTokenUtil.getUserIdFromToken(token);
        if (userId == null) {
            System.err.println("[AccountController] 토큰에서 userId 추출 실패");
            return Messenger.builder()
                    .Code(401)
                    .message("토큰에서 사용자 ID를 추출할 수 없습니다.")
                    .build();
        }
        
        System.out.println("[AccountController] JWT 토큰에서 추출한 userId: " + userId);
        System.out.println("[AccountController] 해당 userId의 가계부 조회 시작");
        Messenger result = accountService.findByUserId(userId);
        System.out.println("[AccountController] 가계부 조회 결과: Code=" + result.getCode() + ", message=" + result.getMessage());
        if (result.getData() != null) {
            System.out.println("[AccountController] 조회된 가계부 개수: " + (result.getData() instanceof List ? ((List<?>) result.getData()).size() : 1));
        }
        return result;
    }

    @GetMapping("/check/{userId}")
    @Operation(summary = "사용자별 가계부 연결 확인", description = "특정 사용자의 가계부 연결 상태를 확인합니다.")
    public Messenger checkUserAccountConnection(@org.springframework.web.bind.annotation.PathVariable Long userId) {
        return accountService.findByUserId(userId);
    }

    @PostMapping
    @Operation(summary = "가계부 저장", description = "새로운 가계부 정보를 저장합니다. JWT 토큰에서 userId를 자동으로 추출합니다. userId가 없으면 기본값 1로 설정됩니다.")
    public Messenger save(
            @RequestBody AccountModel accountModel,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        System.out.println("[AccountController] 저장 요청 수신:");
        System.out.println("  - id: " + accountModel.getId());
        System.out.println("  - transactionDate: " + accountModel.getTransactionDate());
        System.out.println("  - type: " + accountModel.getType());
        System.out.println("  - amount: " + accountModel.getAmount());
        System.out.println("  - userId (요청): " + accountModel.getUserId());
        
        // JWT 토큰에서 userId 추출 및 설정
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = jwtTokenUtil.extractTokenFromHeader(authHeader);
            if (token != null && jwtTokenUtil.validateToken(token)) {
                Long tokenUserId = jwtTokenUtil.getUserIdFromToken(token);
                if (tokenUserId != null) {
                    // 토큰의 userId로 덮어쓰기 (보안 강화)
                    accountModel.setUserId(tokenUserId);
                    System.out.println("  - userId (토큰에서 추출): " + tokenUserId);
                }
            }
        } else {
            // 토큰이 없으면 기본값 1로 설정
            if (accountModel.getUserId() == null) {
                accountModel.setUserId(1L);
                System.out.println("  - userId (기본값): 1");
            }
        }
        
        return accountService.save(accountModel);
    }

    @PostMapping("/saveAll")
    @Operation(summary = "가계부 일괄 저장", description = "여러 가계부 정보를 한 번에 저장합니다. userId가 없으면 기본값 1로 설정됩니다.")
    public Messenger saveAll(@RequestBody List<AccountModel> accountModelList) {
        // userId가 없는 항목은 기본값 1로 설정
        accountModelList.forEach(model -> {
            if (model.getUserId() == null) {
                model.setUserId(1L);
            }
        });
        return accountService.saveAll(accountModelList);
    }

    @PutMapping
    @Operation(summary = "가계부 수정", description = "기존 가계부 정보를 수정합니다. JWT 토큰에서 userId를 자동으로 추출합니다.")
    public Messenger update(
            @RequestBody AccountModel accountModel,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        // JWT 토큰에서 userId 추출 및 설정
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = jwtTokenUtil.extractTokenFromHeader(authHeader);
            if (token != null && jwtTokenUtil.validateToken(token)) {
                Long tokenUserId = jwtTokenUtil.getUserIdFromToken(token);
                if (tokenUserId != null) {
                    accountModel.setUserId(tokenUserId);
                }
            }
        }
        return accountService.update(accountModel);
    }

    @DeleteMapping
    @Operation(summary = "가계부 삭제", description = "가계부 정보를 삭제합니다. JWT 토큰에서 userId를 자동으로 추출합니다.")
    public Messenger delete(
            @RequestBody AccountModel accountModel,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        System.out.println("[AccountController] 삭제 요청 수신:");
        System.out.println("  - id: " + accountModel.getId());
        System.out.println("  - userId (요청): " + accountModel.getUserId());
        
        // JWT 토큰에서 userId 추출 및 설정
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = jwtTokenUtil.extractTokenFromHeader(authHeader);
            if (token != null && jwtTokenUtil.validateToken(token)) {
                Long tokenUserId = jwtTokenUtil.getUserIdFromToken(token);
                if (tokenUserId != null) {
                    // 토큰의 userId로 덮어쓰기 (보안 강화)
                    accountModel.setUserId(tokenUserId);
                    System.out.println("  - userId (토큰에서 추출): " + tokenUserId);
                }
            }
        }
        
        Messenger result = accountService.delete(accountModel);
        System.out.println("[AccountController] 삭제 결과: Code=" + result.getCode() + ", message=" + result.getMessage());
        return result;
    }
}

