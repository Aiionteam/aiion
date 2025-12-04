package site.aiion.api.account;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface AccountRepository extends JpaRepository<Account, Long>, AccountRepositoryCustom {
    // userId로 직접 조회 (관계 해제)
    List<Account> findByUserId(Long userId);
    
    // userId와 날짜 범위로 조회
    @Query("SELECT a FROM Account a WHERE a.userId = :userId AND a.transactionDate BETWEEN :startDate AND :endDate ORDER BY a.transactionDate ASC, a.transactionTime ASC")
    List<Account> findByUserIdAndTransactionDateBetween(
        @Param("userId") Long userId,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );
    
    // userId와 특정 날짜로 조회
    List<Account> findByUserIdAndTransactionDate(Long userId, LocalDate transactionDate);
    
    // 활성화된 알람 조회
    @Query("SELECT a FROM Account a WHERE a.userId = :userId AND a.alarmEnabled = true AND a.alarmDate IS NOT NULL AND a.alarmTime IS NOT NULL ORDER BY a.alarmDate ASC, a.alarmTime ASC")
    List<Account> findActiveAlarmsByUserId(@Param("userId") Long userId);
}

