package site.aiion.api.diary.mbti;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DiaryMbtiRepository extends JpaRepository<DiaryMbti, Long> {
    Optional<DiaryMbti> findByDiaryId(Long diaryId);
    List<DiaryMbti> findByDiaryIdIn(List<Long> diaryIds);
    void deleteByDiaryId(Long diaryId);
}

