package site.aiion.api.healthcare;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "exercise_video_recommendations")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExerciseVideoRecommendation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "rec_id")
    private Long recId;

    // 사용자 ID (Long) - User 테이블의 id와 매핑
    @Column(name = "user_id", nullable = false)
    private Long userId;

    // 운동 종류
    @Column(name = "exercise_type", length = 50)
    private String exerciseType;

    // 검색 쿼리
    @Column(name = "youtube_query", length = 100)
    private String youtubeQuery;

    // 유튜브 영상 ID
    @Column(name = "video_id", length = 50)
    private String videoId;

    // 추천 시각
    @Column(name = "recommended_at", nullable = false)
    private LocalDateTime recommendedAt;
}

