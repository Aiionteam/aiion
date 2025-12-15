package site.aiion.api.account.memo;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MemoRepository extends JpaRepository<Memo, Long> {
    
    /**
     * 계정 ID로 메모 조회
     */
    Optional<Memo> findByAccountId(Long accountId);
    
    /**
     * 사용자 ID로 메모 목록 조회
     */
    List<Memo> findByUserIdOrderByCreatedAtDesc(Long userId);
    
    /**
     * 계정 ID와 사용자 ID로 메모 조회
     */
    Optional<Memo> findByAccountIdAndUserId(Long accountId, Long userId);
    
    /**
     * 계정 ID 리스트와 사용자 ID로 메모 배치 조회 (N+1 쿼리 문제 해결)
     */
    java.util.List<Memo> findByAccountIdInAndUserId(java.util.List<Long> accountIds, Long userId);
    
    /**
     * 계정 ID로 메모 삭제
     */
    void deleteByAccountId(Long accountId);
    
    /**
     * 사용자 ID로 메모 삭제
     */
    void deleteByUserId(Long userId);
}

