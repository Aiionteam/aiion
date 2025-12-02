package site.aiion.api.calendar.event;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface EventRepository extends JpaRepository<Event, Long> {
    
    /**
     * 사용자 ID로 일정 목록 조회
     */
    List<Event> findByUserIdOrderByDateAscTimeAsc(Long userId);
    
    /**
     * 사용자 ID와 날짜로 일정 조회
     */
    List<Event> findByUserIdAndDateOrderByTimeAsc(Long userId, LocalDate date);
    
    /**
     * 사용자 ID와 날짜 범위로 일정 조회
     */
    @Query("SELECT e FROM Event e WHERE e.userId = :userId AND e.date BETWEEN :startDate AND :endDate ORDER BY e.date ASC, e.time ASC")
    List<Event> findByUserIdAndDateBetween(
        @Param("userId") Long userId,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );
    
    /**
     * 사용자 ID로 일정 삭제
     */
    void deleteByUserId(Long userId);
}

