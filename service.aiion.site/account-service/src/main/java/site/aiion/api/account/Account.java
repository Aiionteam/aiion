package site.aiion.api.account;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "accounts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Account {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "transaction_date", nullable = false)
    private LocalDate transactionDate;

    @Column(name = "transaction_time")
    private LocalTime transactionTime;

    @Column(nullable = false, length = 20)
    private String type; // INCOME or EXPENSE

    @Column(nullable = false)
    private Long amount;

    @Column(length = 50)
    private String category;

    @Column(name = "payment_method", length = 50)
    private String paymentMethod;

    @Column(length = 200)
    private String location;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "vat_amount")
    private Double vatAmount;

    @Column(name = "income_source", length = 50)
    private String incomeSource;

    @Column(name = "user_id", nullable = false)
    private Long userId;
}

