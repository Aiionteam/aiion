package site.aiion.api.account;

import java.time.LocalDate;
import java.time.LocalTime;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Builder
@Data
public class AccountModel {
    private Long id;
    
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate transactionDate;
    
    @JsonFormat(pattern = "HH:mm:ss")
    private LocalTime transactionTime;
    
    private String type; // INCOME or EXPENSE
    
    private Long amount;
    
    private String category;
    
    private String paymentMethod;
    
    private String location;
    
    private String description;
    
    private Double vatAmount;
    
    private String incomeSource;
    
    private Long userId;
}

