package site.aiion.api.payment;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import site.aiion.api.payment.common.domain.Messenger;
import site.aiion.api.payment.util.JwtTokenUtil;

@RestController
@RequiredArgsConstructor
@RequestMapping("/payments")
@Tag(name = "Payment", description = "결제 관리 기능")
public class PaymentController {

    private final PaymentService paymentService;
    private final JwtTokenUtil jwtTokenUtil;
    
    @Value("${toss.payments.test-mode:false}")
    private boolean testMode;

    @PostMapping("/subscription")
    @Operation(summary = "프리미엄 구독 결제 요청", description = "프리미엄 구독 결제를 요청합니다.")
    public Messenger requestSubscription(
            @RequestBody SubscriptionRequest request,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        
        // 테스트 모드가 아닐 때만 JWT 토큰 검증
        if (!testMode) {
            // JWT 토큰에서 userId 추출
            Long userId = extractUserIdFromToken(authHeader);
            if (userId == null) {
                return Messenger.builder()
                        .code(401)
                        .message("인증 토큰이 필요합니다.")
                        .build();
            }
            
            // 요청의 userId를 토큰의 userId로 덮어쓰기 (보안 강화)
            request.setUserId(userId);
        } else {
            // 테스트 모드: Body의 userId를 그대로 사용 (없으면 기본값 1)
            if (request.getUserId() == null) {
                request.setUserId(1L);
            }
        }
        
        return paymentService.requestSubscription(request);
    }

    @PostMapping("/confirm")
    @Operation(summary = "결제 승인", description = "Toss Payments에서 발급한 결제 키로 결제를 승인합니다.")
    public Messenger confirmPayment(@RequestBody PaymentConfirmRequest request) {
        return paymentService.confirmPayment(request);
    }

    @PostMapping("/{paymentId}/cancel")
    @Operation(summary = "결제 취소", description = "결제를 취소합니다.")
    public Messenger cancelPayment(
            @PathVariable String paymentId,
            @RequestBody PaymentCancelRequest request) {
        return paymentService.cancelPayment(paymentId, request);
    }

    @GetMapping("/{paymentId}")
    @Operation(summary = "결제 조회", description = "결제 정보를 조회합니다.")
    public Messenger getPayment(@PathVariable String paymentId) {
        return paymentService.getPayment(paymentId);
    }

    @GetMapping("/user/{userId}")
    @Operation(summary = "사용자별 결제 내역 조회", description = "특정 사용자의 결제 내역을 조회합니다.")
    public Messenger getPaymentsByUserId(
            @PathVariable Long userId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        
        // JWT 토큰에서 userId 추출 및 검증
        Long tokenUserId = extractUserIdFromToken(authHeader);
        if (tokenUserId == null || !tokenUserId.equals(userId)) {
            return Messenger.builder()
                    .code(401)
                    .message("인증 토큰이 필요하거나 권한이 없습니다.")
                    .build();
        }
        
        return paymentService.getPaymentsByUserId(userId);
    }

    @PostMapping("/subscription/{userId}/cancel")
    @Operation(summary = "구독 취소", description = "사용자의 활성 구독을 취소합니다. 현재 기간은 유지되며, 다음 결제일부터 구독이 중단됩니다.")
    public Messenger cancelSubscription(
            @PathVariable Long userId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        
        // 테스트 모드가 아닐 때만 JWT 토큰 검증
        if (!testMode) {
            Long tokenUserId = extractUserIdFromToken(authHeader);
            if (tokenUserId == null || !tokenUserId.equals(userId)) {
                return Messenger.builder()
                        .code(401)
                        .message("인증 토큰이 필요하거나 권한이 없습니다.")
                        .build();
            }
        }
        
        return paymentService.cancelSubscription(userId);
    }

    private Long extractUserIdFromToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return null;
        }
        
        String token = jwtTokenUtil.extractTokenFromHeader(authHeader);
        if (token == null || !jwtTokenUtil.validateToken(token)) {
            return null;
        }
        
        return jwtTokenUtil.getUserIdFromToken(token);
    }
}


