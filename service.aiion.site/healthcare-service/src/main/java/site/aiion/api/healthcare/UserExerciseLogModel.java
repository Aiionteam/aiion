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
public class UserExerciseLogModel {
    private Long logId;

    private Long userId;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate date;

    private String exerciseType;

    private Integer durationMinutes;

    private String intensity;

    private String mood;

    private String notes;
}

