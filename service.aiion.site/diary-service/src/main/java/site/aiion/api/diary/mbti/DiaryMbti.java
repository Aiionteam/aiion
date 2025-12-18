package site.aiion.api.diary.mbti;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "diary_mbti")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DiaryMbti {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "diary_id", nullable = false, unique = true)
    private Long diaryId;

    /**
     * E/I 차원 (0: 평가불가, 1: E, 2: I)
     */
    @Column(name = "e_i", nullable = false)
    private Integer eI;

    /**
     * S/N 차원 (0: 평가불가, 1: S, 2: N)
     */
    @Column(name = "s_n", nullable = false)
    private Integer sN;

    /**
     * T/F 차원 (0: 평가불가, 1: T, 2: F)
     */
    @Column(name = "t_f", nullable = false)
    private Integer tF;

    /**
     * J/P 차원 (0: 평가불가, 1: J, 2: P)
     */
    @Column(name = "j_p", nullable = false)
    private Integer jP;

    /**
     * MBTI 타입 문자열 (예: "ENFP", "평가불가")
     */
    @Column(name = "mbti_type", length = 20)
    private String mbtiType;

    /**
     * 신뢰도 (0.0 ~ 1.0)
     */
    @Column(name = "confidence")
    private Double confidence;

    /**
     * 각 차원별 확률 정보 (JSON 형식: {"E_I": {"E": 0.7, "I": 0.3}, ...})
     */
    @Column(name = "probabilities", columnDefinition = "TEXT")
    private String probabilities;

    /**
     * 4축별 확률 퍼센트 정보 (JSON 형식: {"E_I":{"selected":"E","percent":90.0,"confidence_percent":90.0},...})
     */
    @Column(name = "dimension_percentages", columnDefinition = "TEXT")
    private String dimensionPercentages;

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

