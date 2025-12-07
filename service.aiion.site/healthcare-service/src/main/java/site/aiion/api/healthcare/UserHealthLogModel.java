package site.aiion.api.healthcare;

import java.time.LocalDate;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Builder
@Data
public class UserHealthLogModel {
    private Long logId;

    private Long userId;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate date;

    private String healthType;

    private String value;

    private String recommendation;

    private String notes;
}

