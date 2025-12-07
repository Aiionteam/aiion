package site.aiion.api.payment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByPaymentId(String paymentId);
    Optional<Payment> findByOrderId(String orderId);
    List<Payment> findByUserId(Long userId);
    List<Payment> findByUserIdAndStatus(Long userId, String status);
}

