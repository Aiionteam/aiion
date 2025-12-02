package site.aiion.api.calendar.event;

import java.time.LocalDate;
import java.util.List;

import site.aiion.api.domain.Messenger;

public interface EventService {
    /**
     * 일정 ID로 조회
     */
    Messenger findById(EventModel eventModel);
    
    /**
     * 사용자 ID로 일정 목록 조회
     */
    Messenger findByUserId(Long userId);
    
    /**
     * 사용자 ID와 날짜로 일정 조회
     */
    Messenger findByUserIdAndDate(Long userId, LocalDate date);
    
    /**
     * 사용자 ID와 날짜 범위로 일정 조회
     */
    Messenger findByUserIdAndDateRange(Long userId, LocalDate startDate, LocalDate endDate);
    
    /**
     * 일정 저장
     */
    Messenger save(EventModel eventModel);
    
    /**
     * 일정 일괄 저장
     */
    Messenger saveAll(List<EventModel> eventModelList);
    
    /**
     * 일정 수정
     */
    Messenger update(EventModel eventModel);
    
    /**
     * 일정 삭제
     */
    Messenger delete(EventModel eventModel);
}

