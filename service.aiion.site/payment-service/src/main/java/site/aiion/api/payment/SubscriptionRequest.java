package site.aiion.api.payment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Builder
@Data
public class SubscriptionRequest {
    private Long userId;
    private String subscriptionType;  // MONTHLY, YEARLY
    private String planName;  // 프리미엄 플랜
    private Long amount;
    private String customerName;
    private String customerEmail;
}

