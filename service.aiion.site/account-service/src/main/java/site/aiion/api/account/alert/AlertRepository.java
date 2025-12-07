package site.aiion.api.account.alert;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface AlertRepository extends JpaRepository<Alert, Long> {
    
    /**
     * 계정 ID로 알람 조회
     */
    Optional<Alert> findByAccountId(Long accountId);
    
    /**
     * 사용자 ID로 활성화된 알람 목록 조회
     */
    @Query("SELECT a FROM Alert a WHERE a.userId = :userId AND a.alarmEnabled = true AND a.alarmDate IS NOT NULL AND a.alarmTime IS NOT NULL ORDER BY a.alarmDate ASC, a.alarmTime ASC")
    List<Alert> findActiveAlarmsByUserId(@Param("userId") Long userId);
    
    /**
     * 계정 ID와 사용자 ID로 알람 조회
     */
    Optional<Alert> findByAccountIdAndUserId(Long accountId, Long userId);
    
    /**
     * 계정 ID 리스트와 사용자 ID로 알람 배치 조회 (N+1 쿼리 문제 해결)
     */
    java.util.List<Alert> findByAccountIdInAndUserId(java.util.List<Long> accountIds, Long userId);
    
    /**
     * 계정 ID로 알람 삭제
     */
    void deleteByAccountId(Long accountId);
    
    /**
     * 사용자 ID로 알람 삭제
     */
    void deleteByUserId(Long userId);
}

