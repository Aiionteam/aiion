package site.aiion.api.account.memo;

import site.aiion.api.account.common.domain.Messenger;

public interface MemoService {
    /**
     * 메모 ID로 조회
     */
    Messenger findById(MemoModel memoModel);
    
    /**
     * 계정 ID로 메모 조회
     */
    Messenger findByAccountId(Long accountId, Long userId);
    
    /**
     * 계정 ID 리스트로 메모 배치 조회 (N+1 쿼리 문제 해결)
     */
    java.util.Map<Long, MemoModel> findByAccountIds(java.util.List<Long> accountIds, Long userId);
    
    /**
     * 사용자 ID로 메모 목록 조회
     */
    Messenger findByUserId(Long userId);
    
    /**
     * 메모 저장
     */
    Messenger save(MemoModel memoModel);
    
    /**
     * 메모 수정
     */
    Messenger update(MemoModel memoModel);
    
    /**
     * 메모 삭제
     */
    Messenger delete(MemoModel memoModel);
}

