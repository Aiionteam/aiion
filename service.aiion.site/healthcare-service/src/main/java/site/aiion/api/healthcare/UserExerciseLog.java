package site.aiion.api.healthcare;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Entity
@Table(name = "user_exercise_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserExerciseLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "log_id")
    private Long logId;

    // 사용자 ID (Long) - User 테이블의 id와 매핑
    @Column(name = "user_id", nullable = false)
    private Long userId;

    // 운동 날짜
    @Column(name = "date", nullable = false)
    private LocalDate date;

    // 운동 종류 (예: 러닝, 요가)
    @Column(name = "exercise_type", length = 50)
    private String exerciseType;

    // 운동 시간 (분)
    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    // 강도 (예: 낮음, 중간, 높음)
    @Column(name = "intensity", length = 20)
    private String intensity;

    // 운동 후 기분
    @Column(name = "mood", length = 50)
    private String mood;

    // 일기에서 추출된 맥락
    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
}

