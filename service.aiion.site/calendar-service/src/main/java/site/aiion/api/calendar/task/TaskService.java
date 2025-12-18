package site.aiion.api.calendar.task;

import java.time.LocalDate;
import java.util.List;

import site.aiion.api.domain.Messenger;

public interface TaskService {
    /**
     * 할 일 ID로 조회
     */
    Messenger findById(TaskModel taskModel);
    
    /**
     * 사용자 ID로 할 일 목록 조회
     */
    Messenger findByUserId(Long userId);
    
    /**
     * 사용자 ID와 날짜로 할 일 조회
     */
    Messenger findByUserIdAndDate(Long userId, LocalDate date);
    
    /**
     * 사용자 ID와 완료 상태로 할 일 조회
     */
    Messenger findByUserIdAndCompleted(Long userId, Boolean completed);
    
    /**
     * 할 일 저장
     */
    Messenger save(TaskModel taskModel);
    
    /**
     * 할 일 일괄 저장
     */
    Messenger saveAll(List<TaskModel> taskModelList);
    
    /**
     * 할 일 수정
     */
    Messenger update(TaskModel taskModel);
    
    /**
     * 할 일 완료 상태 토글
     */
    Messenger toggleCompleted(Long taskId, Long userId);
    
    /**
     * 할 일 삭제
     */
    Messenger delete(TaskModel taskModel);
}

