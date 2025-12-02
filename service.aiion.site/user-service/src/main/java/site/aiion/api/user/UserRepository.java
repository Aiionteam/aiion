package site.aiion.api.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, Long>, UserRepositoryCustom {
    // 이메일과 제공자로 사용자 조회
    java.util.Optional<User> findByEmailAndProvider(String email, String provider);
}
