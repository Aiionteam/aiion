package site.aiion.api.account;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AccountRepository extends JpaRepository<Account, Long>, AccountRepositoryCustom {
    // userId로 직접 조회 (관계 해제)
    List<Account> findByUserId(Long userId);
}

