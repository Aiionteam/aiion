package site.aiion.api.healthcare;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserExerciseLogRepository extends JpaRepository<UserExerciseLog, Long> {
    // userId로 조회
    List<UserExerciseLog> findByUserId(Long userId);

    // userId와 date로 조회
    List<UserExerciseLog> findByUserIdAndDate(Long userId, LocalDate date);

    // userId와 exerciseType으로 조회
    List<UserExerciseLog> findByUserIdAndExerciseType(Long userId, String exerciseType);

    // 특정 날짜 범위로 조회
    List<UserExerciseLog> findByUserIdAndDateBetween(Long userId, LocalDate startDate, LocalDate endDate);
}

