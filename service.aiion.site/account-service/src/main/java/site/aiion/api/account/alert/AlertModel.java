package site.aiion.api.account.alert;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@NoArgsConstructor
@AllArgsConstructor
@Builder
@Getter
@Setter
public class AlertModel {
    private Long id;
    private Long accountId;
    private Long userId;
    private Boolean alarmEnabled;
    
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate alarmDate;
    
    @JsonFormat(pattern = "HH:mm")
    private LocalTime alarmTime;
    
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
    
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updatedAt;
}

