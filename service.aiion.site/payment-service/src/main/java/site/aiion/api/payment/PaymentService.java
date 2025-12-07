package site.aiion.api.payment;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import site.aiion.api.payment.common.domain.Messenger;
import site.aiion.api.payment.client.TossPaymentsClient;
import site.aiion.api.payment.client.UserServiceClient;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final TossPaymentsClient tossPaymentsClient;
    private final UserServiceClient userServiceClient;
    
    @Value("${toss.payments.test-mode:false}")
    private boolean testMode;

    @Transactional
    public Messenger requestSubscription(SubscriptionRequest request) {
        try {
            // 주문 ID 생성
            String orderId = "ORDER-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            
            // 결제 정보 저장
            Payment payment = Payment.builder()
                    .paymentId("PAYMENT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                    .orderId(orderId)
                    .userId(request.getUserId())
                    .amount(request.getAmount())
                    .subscriptionType(request.getSubscriptionType())
                    .status("PENDING")
                    .build();
            
            payment = paymentRepository.save(payment);
            
            // 테스트 모드가 아닐 때만 Toss Payments API 호출
            String paymentKey;
            String checkoutUrl;
            
            if (!testMode) {
                // Toss Payments 결제 요청
                TossPaymentsClient.PaymentRequestResponse response = tossPaymentsClient.requestPayment(
                        orderId,
                        request.getAmount(),
                        request.getPlanName(),
                        request.getCustomerName(),
                        request.getCustomerEmail()
                );
                paymentKey = response.getPaymentKey();
                checkoutUrl = response.getCheckoutUrl();
                log.info("[PaymentService] Toss Payments 결제 요청 성공 (테스트 모드: false)");
            } else {
                // 테스트 모드: 더미 데이터 생성
                paymentKey = "TEST_KEY_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
                checkoutUrl = "http://localhost:3000/payment/test?paymentKey=" + paymentKey;
                log.info("[PaymentService] 테스트 모드: Toss Payments API 호출 스킵, 더미 데이터 생성");
            }
            
            // 결제 정보 업데이트
            payment.setPaymentKey(paymentKey);
            paymentRepository.save(payment);
            
            return Messenger.builder()
                    .code(200)
                    .message(testMode ? "결제 요청이 생성되었습니다. (테스트 모드)" : "결제 요청이 생성되었습니다.")
                    .data(PaymentModel.builder()
                            .paymentId(payment.getPaymentId())
                            .orderId(payment.getOrderId())
                            .checkoutUrl(checkoutUrl)
                            .status(payment.getStatus())
                            .build())
                    .build();
        } catch (Exception e) {
            log.error("[PaymentService] 결제 요청 중 오류 발생: {}", e.getMessage(), e);
            return Messenger.builder()
                    .code(500)
                    .message("결제 요청 중 오류가 발생했습니다: " + e.getMessage())
                    .build();
        }
    }

    @Transactional
    public Messenger confirmPayment(PaymentConfirmRequest request) {
        Payment payment = paymentRepository.findByPaymentId(request.getPaymentId())
                .orElseThrow(() -> new RuntimeException("결제 정보를 찾을 수 없습니다."));
        
        try {
            // 테스트 모드가 아닐 때만 Toss Payments API 호출
            if (!testMode) {
                // Toss Payments 결제 승인
                TossPaymentsClient.PaymentConfirmResponse response = tossPaymentsClient.confirmPayment(
                        request.getPaymentKey(),
                        request.getOrderId(),
                        request.getAmount()
                );
                log.info("[PaymentService] Toss Payments 결제 승인 성공 (테스트 모드: false)");
            } else {
                log.info("[PaymentService] 테스트 모드: Toss Payments API 호출 스킵");
            }
            
            // 결제 정보 업데이트
            payment.setStatus("APPROVED");
            payment.setPaymentKey(request.getPaymentKey());
            payment.setApprovedAt(LocalDateTime.now());
            
            // 구독 만료일 설정
            if (payment.getSubscriptionType() != null) {
                if ("MONTHLY".equals(payment.getSubscriptionType())) {
                    payment.setExpiresAt(LocalDateTime.now().plusMonths(1));
                } else if ("YEARLY".equals(payment.getSubscriptionType())) {
                    payment.setExpiresAt(LocalDateTime.now().plusYears(1));
                }
            }
            
            paymentRepository.save(payment);
            
            // user-service에 구독 상태 업데이트 (테스트 모드에서는 스킵 가능)
            if (payment.getSubscriptionType() != null && !testMode) {
                try {
                    userServiceClient.updateSubscription(
                            payment.getUserId(),
                            payment.getSubscriptionType(),
                            payment.getExpiresAt()
                    );
                } catch (Exception e) {
                    log.warn("[PaymentService] user-service 구독 상태 업데이트 실패 (무시): {}", e.getMessage());
                }
            }
            
            return Messenger.builder()
                    .code(200)
                    .message(testMode ? "결제가 승인되었습니다. (테스트 모드)" : "결제가 승인되었습니다.")
                    .data(entityToModel(payment))
                    .build();
        } catch (Exception e) {
            // 결제 승인 실패 시 FAILED 상태로 변경
            payment.setStatus("FAILED");
            paymentRepository.save(payment);
            
            return Messenger.builder()
                    .code(500)
                    .message("결제 승인 중 오류가 발생했습니다: " + e.getMessage())
                    .data(entityToModel(payment))
                    .build();
        }
    }

    @Transactional
    public Messenger cancelPayment(String paymentId, PaymentCancelRequest request) {
        try {
            Payment payment = paymentRepository.findByPaymentId(paymentId)
                    .orElseThrow(() -> new RuntimeException("결제 정보를 찾을 수 없습니다."));
            
            // 테스트 모드가 아닐 때만 Toss Payments API 호출
            if (!testMode) {
                // Toss Payments 결제 취소
                tossPaymentsClient.cancelPayment(
                        payment.getPaymentKey(),
                        request.getCancelReason(),
                        request.getCancelAmount()
                );
                log.info("[PaymentService] Toss Payments 결제 취소 성공 (테스트 모드: false)");
            } else {
                log.info("[PaymentService] 테스트 모드: Toss Payments API 호출 스킵");
            }
            
            // 결제 정보 업데이트
            payment.setStatus("CANCELLED");
            payment.setCancelledAt(LocalDateTime.now());
            paymentRepository.save(payment);
            
            return Messenger.builder()
                    .code(200)
                    .message(testMode ? "결제가 취소되었습니다. (테스트 모드)" : "결제가 취소되었습니다.")
                    .data(entityToModel(payment))
                    .build();
        } catch (Exception e) {
            return Messenger.builder()
                    .code(500)
                    .message("결제 취소 중 오류가 발생했습니다: " + e.getMessage())
                    .build();
        }
    }

    public Messenger getPayment(String paymentId) {
        try {
            log.info("[PaymentService] 결제 조회 요청: paymentId={}", paymentId);
            
            Payment payment = paymentRepository.findByPaymentId(paymentId)
                    .orElse(null);
            
            if (payment == null) {
                log.warn("[PaymentService] 결제 정보를 찾을 수 없음: paymentId={}", paymentId);
                return Messenger.builder()
                        .code(404)
                        .message("결제 정보를 찾을 수 없습니다.")
                        .build();
            }
            
            log.info("[PaymentService] 결제 조회 성공: paymentId={}, status={}", paymentId, payment.getStatus());
            return Messenger.builder()
                    .code(200)
                    .message("결제 정보 조회 성공")
                    .data(entityToModel(payment))
                    .build();
        } catch (Exception e) {
            log.error("[PaymentService] 결제 조회 중 오류 발생: paymentId={}, error={}", paymentId, e.getMessage(), e);
            return Messenger.builder()
                    .code(500)
                    .message("결제 조회 중 오류가 발생했습니다: " + e.getMessage())
                    .build();
        }
    }

    public Messenger getPaymentsByUserId(Long userId) {
        List<Payment> payments = paymentRepository.findByUserId(userId);
        
        List<PaymentModel> paymentModels = payments.stream()
                .map(this::entityToModel)
                .collect(Collectors.toList());
        
        return Messenger.builder()
                .code(200)
                .message("결제 내역 조회 성공")
                .data(paymentModels)
                .build();
    }

    @Transactional
    public Messenger cancelSubscription(Long userId) {
        try {
            log.info("[PaymentService] 구독 취소 요청: userId={}", userId);
            
            // 사용자의 활성 구독 찾기 (APPROVED 상태이고 구독 취소되지 않은 것)
            List<Payment> activeSubscriptions = paymentRepository.findByUserId(userId).stream()
                    .filter(p -> "APPROVED".equals(p.getStatus()))
                    .filter(p -> p.getSubscriptionType() != null)
                    .filter(p -> p.getSubscriptionCancelledAt() == null)
                    .filter(p -> p.getExpiresAt() == null || p.getExpiresAt().isAfter(LocalDateTime.now()))
                    .collect(Collectors.toList());
            
            if (activeSubscriptions.isEmpty()) {
                return Messenger.builder()
                        .code(404)
                        .message("활성 구독을 찾을 수 없습니다.")
                        .build();
            }
            
            // 모든 활성 구독 취소
            for (Payment payment : activeSubscriptions) {
                payment.setSubscriptionCancelledAt(LocalDateTime.now());
                paymentRepository.save(payment);
                log.info("[PaymentService] 구독 취소 완료: paymentId={}, userId={}", payment.getPaymentId(), userId);
            }
            
            // user-service에 구독 상태 업데이트 (테스트 모드에서는 스킵)
            if (!testMode) {
                try {
                    userServiceClient.updateSubscription(userId, null, null);
                } catch (Exception e) {
                    log.warn("[PaymentService] user-service 구독 상태 업데이트 실패 (무시): {}", e.getMessage());
                }
            }
            
            return Messenger.builder()
                    .code(200)
                    .message("구독이 취소되었습니다. 현재 기간은 유지되며, 다음 결제일부터 구독이 중단됩니다.")
                    .data(activeSubscriptions.stream()
                            .map(this::entityToModel)
                            .collect(Collectors.toList()))
                    .build();
        } catch (Exception e) {
            log.error("[PaymentService] 구독 취소 중 오류 발생: userId={}, error={}", userId, e.getMessage(), e);
            return Messenger.builder()
                    .code(500)
                    .message("구독 취소 중 오류가 발생했습니다: " + e.getMessage())
                    .build();
        }
    }

    private PaymentModel entityToModel(Payment entity) {
        return PaymentModel.builder()
                .id(entity.getId())
                .paymentId(entity.getPaymentId())
                .orderId(entity.getOrderId())
                .userId(entity.getUserId())
                .amount(entity.getAmount())
                .subscriptionType(entity.getSubscriptionType())
                .featureType(entity.getFeatureType())
                .status(entity.getStatus())
                .paymentKey(entity.getPaymentKey())
                .approvedAt(entity.getApprovedAt())
                .cancelledAt(entity.getCancelledAt())
                .expiresAt(entity.getExpiresAt())
                .subscriptionCancelledAt(entity.getSubscriptionCancelledAt())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}

