package site.aiion.api.healthcare;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface HealthcareRepository extends JpaRepository<Healthcare, Long>, HealthcareRepositoryCustom {
    boolean existsByRecordDate(LocalDate recordDate);

    Optional<Healthcare> findByRecordDate(LocalDate recordDate);

    // userId로 직접 조회 (관계 해제)
    List<Healthcare> findByUserId(Long userId);

    // userId와 type으로 조회
    List<Healthcare> findByUserIdAndType(Long userId, String type);
}
