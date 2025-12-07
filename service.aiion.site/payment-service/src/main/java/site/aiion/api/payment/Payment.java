package site.aiion.api.payment;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Payment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "payment_id", unique = true, nullable = false, length = 100)
    private String paymentId;  // Toss Payments에서 발급한 결제 ID
    
    @Column(name = "order_id", nullable = false, length = 100)
    private String orderId;
    
    @Column(name = "user_id", nullable = false)
    private Long userId;
    
    @Column(nullable = false)
    private Long amount;
    
    @Column(name = "subscription_type", length = 20)
    private String subscriptionType;  // MONTHLY, YEARLY, null (일회성)
    
    @Column(name = "feature_type", length = 50)
    private String featureType;  // AI_ANALYSIS, BACKUP, TEMPLATE, AD_REMOVAL, null
    
    @Column(name = "status", nullable = false, length = 20)
    private String status;  // PENDING, APPROVED, CANCELLED, FAILED
    
    @Column(name = "payment_key", length = 200)
    private String paymentKey;  // Toss Payments에서 발급한 결제 키
    
    @Column(name = "approved_at")
    private LocalDateTime approvedAt;
    
    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;
    
    @Column(name = "expires_at")
    private LocalDateTime expiresAt;  // 구독 만료일
    
    @Column(name = "subscription_cancelled_at")
    private LocalDateTime subscriptionCancelledAt;  // 구독 취소일 (다음 결제일부터 구독 중단)
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

