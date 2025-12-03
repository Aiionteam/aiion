package site.aiion.api.healthcare;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

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
