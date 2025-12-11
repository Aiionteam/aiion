package site.aiion.api.diary;

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
public class DiaryModel {
    private Long id;
    
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate diaryDate;
    
    private String title;
    private String content;
    private Long userId;
    
    // 감정 분석 결과 (선택적)
    private Integer emotion;
    private String emotionLabel;
    private Double emotionConfidence;
    /**
     * 감정별 확률 정보 (JSON 문자열: {"평가불가": 0.1, "기쁨": 0.8, ...})
     */
    private String emotionProbabilities;
    
    // MBTI 분석 결과 (선택적)
    private String mbtiType;
    private Double mbtiConfidence;
}

