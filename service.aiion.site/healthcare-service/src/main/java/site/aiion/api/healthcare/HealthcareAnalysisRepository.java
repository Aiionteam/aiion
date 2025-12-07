package site.aiion.api.healthcare;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface HealthcareAnalysisRepository extends JpaRepository<HealthcareAnalysis, Long> {
    Optional<HealthcareAnalysis> findByUserId(Long userId);
}

