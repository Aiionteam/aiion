package site.aiion.api.diary;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DiaryRepository extends JpaRepository<Diary, Long>, DiaryRepositoryCustom {
    boolean existsByDiaryDate(LocalDate diaryDate);
    Optional<Diary> findByDiaryDate(LocalDate diaryDate);
    // userId로 직접 조회 (관계 해제)
    List<Diary> findByUserId(Long userId);
}

