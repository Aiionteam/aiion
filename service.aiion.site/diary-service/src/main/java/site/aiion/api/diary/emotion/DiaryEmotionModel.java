package site.aiion.api.diary.emotion;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@NoArgsConstructor
@AllArgsConstructor
@Builder
@Getter
@Setter
public class DiaryEmotionModel {
    private Long id;
    private Long diaryId;
           /**
            * 감정 코드 (0: 평가불가, 1: 기쁨, 2: 슬픔, 3: 분노, 4: 두려움, 5: 혐오, 6: 놀람, 7: 신뢰, 8: 기대, 9: 불안, 10: 안도, 11: 후회, 12: 그리움, 13: 감사, 14: 외로움)
            */
    private Integer emotion;
    private String emotionLabel;
    private Double confidence;
    /**
     * 감정별 확률 정보 (JSON 형식: {"평가불가": 0.1, "기쁨": 0.8, ...})
     */
    private String probabilities;
    private LocalDateTime analyzedAt;
}
