package site.aiion.api.healthcare;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserHealthLogRepository extends JpaRepository<UserHealthLog, Long> {
    // userId로 조회
    List<UserHealthLog> findByUserId(Long userId);

    // userId와 date로 조회
    List<UserHealthLog> findByUserIdAndDate(Long userId, LocalDate date);

    // userId와 healthType으로 조회
    List<UserHealthLog> findByUserIdAndHealthType(Long userId, String healthType);

    // 특정 날짜 범위로 조회
    List<UserHealthLog> findByUserIdAndDateBetween(Long userId, LocalDate startDate, LocalDate endDate);
}

