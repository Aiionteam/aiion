package site.aiion.api.diary.emotion;

import site.aiion.api.diary.common.domain.Messenger;
import java.util.List;
import java.util.Map;

public interface DiaryEmotionService {
    /**
     * 일기 ID로 감정 분석 결과 조회
     */
    Messenger findByDiaryId(Long diaryId);
    
    /**
     * 여러 일기 ID로 감정 분석 결과 일괄 조회 (N+1 문제 해결)
     * @return diaryId를 키로 하는 Map
     */
    Map<Long, DiaryEmotionModel> findByDiaryIdIn(List<Long> diaryIds);
    
    /**
     * 일기 텍스트의 감정 분석 수행 및 저장
     */
    Messenger analyzeAndSave(Long diaryId, String title, String content);
    
    /**
     * 일기 텍스트의 감정 분석 수행 및 저장 (비동기)
     */
    void analyzeAndSaveAsync(Long diaryId, String title, String content);
    
    /**
     * 일기 삭제 시 감정 분석 결과도 함께 삭제
     */
    Messenger deleteByDiaryId(Long diaryId);
}
