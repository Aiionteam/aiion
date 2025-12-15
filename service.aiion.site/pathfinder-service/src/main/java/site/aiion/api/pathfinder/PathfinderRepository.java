package site.aiion.api.pathfinder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PathfinderRepository extends JpaRepository<Pathfinder, Long>, PathfinderRepositoryCustom {
    boolean existsByCreatedAt(LocalDateTime createdAt);
    Optional<Pathfinder> findByCreatedAt(LocalDateTime createdAt);
    // userId로 직접 조회 (관계 해제)
    List<Pathfinder> findByUserId(Long userId);
}

