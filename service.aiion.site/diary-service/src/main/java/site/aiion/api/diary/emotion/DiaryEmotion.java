package site.aiion.api.diary.emotion;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "diary_emotions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DiaryEmotion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "diary_id", nullable = false, unique = true)
    private Long diaryId;

    /**
     * 감정 코드 (0: 평가불가, 1: 기쁨, 2: 슬픔, 3: 분노, 4: 두려움, 5: 혐오, 6: 놀람)
     */
    @Column(nullable = false)
    private Integer emotion;

    @Column(name = "emotion_label", length = 50)
    private String emotionLabel;

    @Column(name = "confidence")
    private Double confidence;

    @Column(name = "analyzed_at", nullable = false)
    @Builder.Default
    private LocalDateTime analyzedAt = LocalDateTime.now();

    @PrePersist
    protected void onCreate() {
        if (analyzedAt == null) {
            analyzedAt = LocalDateTime.now();
        }
    }
}
