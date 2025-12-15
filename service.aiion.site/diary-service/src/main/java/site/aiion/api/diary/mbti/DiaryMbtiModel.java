package site.aiion.api.diary.mbti;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DiaryMbtiModel {
    private Long id;
    private Long diaryId;
    private Integer eI;
    private Integer sN;
    private Integer tF;
    private Integer jP;
    private String mbtiType;
    private Double confidence;
    private String probabilities;
    private String dimensionPercentages;
    private LocalDateTime analyzedAt;
}

