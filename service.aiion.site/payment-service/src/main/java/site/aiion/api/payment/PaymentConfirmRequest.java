package site.aiion.api.payment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Builder
@Data
public class PaymentConfirmRequest {
    private String paymentId;
    private String paymentKey;
    private String orderId;
    private Long amount;
}

