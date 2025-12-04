package site.aiion.api.account.alert;

import site.aiion.api.account.common.domain.Messenger;

public interface AlertService {
    /**
     * 알람 ID로 조회
     */
    Messenger findById(AlertModel alertModel);
    
    /**
     * 계정 ID로 알람 조회
     */
    Messenger findByAccountId(Long accountId, Long userId);
    
    /**
     * 사용자 ID로 활성화된 알람 목록 조회
     */
    Messenger findActiveAlarmsByUserId(Long userId);
    
    /**
     * 알람 저장
     */
    Messenger save(AlertModel alertModel);
    
    /**
     * 알람 수정
     */
    Messenger update(AlertModel alertModel);
    
    /**
     * 알람 삭제
     */
    Messenger delete(AlertModel alertModel);
}

