package site.aiion.api.calendar.task;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {
    
    /**
     * 사용자 ID로 할 일 목록 조회
     */
    List<Task> findByUserIdOrderByDateAsc(Long userId);
    
    /**
     * 사용자 ID와 날짜로 할 일 조회
     */
    List<Task> findByUserIdAndDateOrderByDateAsc(Long userId, LocalDate date);
    
    /**
     * 사용자 ID와 완료 상태로 할 일 조회
     */
    List<Task> findByUserIdAndCompletedOrderByDateAsc(Long userId, Boolean completed);
    
    /**
     * 사용자 ID와 날짜, 완료 상태로 할 일 조회
     */
    List<Task> findByUserIdAndDateAndCompletedOrderByDateAsc(Long userId, LocalDate date, Boolean completed);
    
    /**
     * 사용자 ID로 할 일 삭제
     */
    void deleteByUserId(Long userId);
}

