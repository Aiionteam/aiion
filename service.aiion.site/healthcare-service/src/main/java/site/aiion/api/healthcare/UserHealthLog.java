package site.aiion.api.healthcare;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Entity
@Table(name = "user_health_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserHealthLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "log_id")
    private Long logId;

    // 사용자 ID (Long) - User 테이블의 id와 매핑
    @Column(name = "user_id", nullable = false)
    private Long userId;

    // 기록 날짜
    @Column(name = "date", nullable = false)
    private LocalDate date;

    // 건강 항목 (예: 수면, 식사, 스트레스)
    @Column(name = "health_type", length = 50)
    private String healthType;

    // 수치 또는 상태 (예: 2시간 감소, 800kcal 초과)
    @Column(name = "value", length = 100)
    private String value;

    // AI가 생성한 조언 또는 경고
    @Column(name = "recommendation", columnDefinition = "TEXT")
    private String recommendation;

    // 일기에서 추출된 맥락
    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
}

