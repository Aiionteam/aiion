package site.aiion.api.healthcare;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ExerciseVideoRecommendationRepository extends JpaRepository<ExerciseVideoRecommendation, Long> {
    // userId로 조회
    List<ExerciseVideoRecommendation> findByUserId(Long userId);

    // userId와 exerciseType으로 조회
    List<ExerciseVideoRecommendation> findByUserIdAndExerciseType(Long userId, String exerciseType);

    // userId와 videoId로 조회
    List<ExerciseVideoRecommendation> findByUserIdAndVideoId(Long userId, String videoId);

    // 특정 날짜 범위로 조회
    List<ExerciseVideoRecommendation> findByUserIdAndRecommendedAtBetween(Long userId, LocalDateTime startDate, LocalDateTime endDate);
}

