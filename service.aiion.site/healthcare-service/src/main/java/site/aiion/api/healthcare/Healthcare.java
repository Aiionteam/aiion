package site.aiion.api.healthcare;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

/**
 * @deprecated 이 클래스는 더 이상 사용되지 않습니다.
 *             대신 다음 클래스들을 사용하세요:
 *             - UserExerciseLog: 운동 기록
 *             - UserHealthLog: 건강 기록
 *             - UserScanDocument: 스캔 문서
 *             - ExerciseVideoRecommendation: 운동 영상 추천
 * 
 *             이 클래스는 기존 데이터 호환성을 위해 유지되지만, 새로운 기능 개발 시 사용하지 마세요.
 */
@Deprecated
@Entity
@Table(name = "healthcare_records")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Healthcare {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 사용자 ID
    @Column(name = "user_id")
    private Long userId;

    // 기록 유형 (건강, 운동, 운동/건강 등)
    @Column(name = "type", length = 50)
    private String type;

    // 기록 날짜
    @Column(name = "record_date")
    private LocalDate recordDate;

    // 수면 시간 (시간)
    @Column(name = "sleep_hours")
    private Double sleepHours;

    // 식사/영양 정보
    @Column(name = "nutrition", columnDefinition = "TEXT")
    private String nutrition;

    // 걸음수
    @Column(name = "steps")
    private Integer steps;

    // 체중 (kg)
    @Column(name = "weight")
    private Double weight;

    // 혈압 (예: "120/80")
    @Column(name = "blood_pressure", length = 20)
    private String bloodPressure;

    // 컨디션 (1-5 점수 또는 텍스트)
    @Column(name = "condition", length = 50)
    private String condition;

    // 주간 요약
    @Column(name = "weekly_summary", columnDefinition = "TEXT")
    private String weeklySummary;

    // 추천 루틴
    @Column(name = "recommended_routine", columnDefinition = "TEXT")
    private String recommendedRoutine;
}
