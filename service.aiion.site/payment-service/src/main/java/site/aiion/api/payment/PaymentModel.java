package site.aiion.api.payment;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@NoArgsConstructor
@AllArgsConstructor
@Builder
@Data
public class PaymentModel {
    private Long id;
    private String paymentId;
    private String orderId;
    private Long userId;
    private Long amount;
    private String subscriptionType;  // MONTHLY, YEARLY
    private String featureType;  // AI_ANALYSIS, BACKUP, TEMPLATE, AD_REMOVAL
    private String status;  // PENDING, APPROVED, CANCELLED, FAILED
    private String paymentKey;
    private String checkoutUrl;  // 결제 URL (요청 시에만 반환)
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime approvedAt;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime cancelledAt;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime expiresAt;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime subscriptionCancelledAt;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;
}
