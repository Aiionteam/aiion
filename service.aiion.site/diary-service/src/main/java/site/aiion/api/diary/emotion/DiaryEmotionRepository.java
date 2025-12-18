package site.aiion.api.diary.emotion;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface DiaryEmotionRepository extends JpaRepository<DiaryEmotion, Long> {
    /**
     * 일기 ID로 감정 분석 결과 조회
     */
    Optional<DiaryEmotion> findByDiaryId(Long diaryId);

    /**
     * 여러 일기 ID로 감정 분석 결과 일괄 조회 (N+1 문제 해결)
     */
    List<DiaryEmotion> findByDiaryIdIn(List<Long> diaryIds);

    /**
     * 일기 ID로 감정 분석 결과 삭제
     */
    void deleteByDiaryId(Long diaryId);
}
