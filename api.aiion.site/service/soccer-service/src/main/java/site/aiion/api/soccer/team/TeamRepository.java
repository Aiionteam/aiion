package site.aiion.api.soccer.team;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface TeamRepository extends JpaRepository<Team, Long> {
    @Query("SELECT t FROM Team t WHERE t.team_uk = :teamUk")
    Optional<Team> findByTeam_uk(@Param("teamUk") String teamUk);
    
    /**
     * 검색어로 팀 검색 (팀명, 영문명, 지역명에서 검색)
     */
    @Query("SELECT t FROM Team t WHERE " +
           "LOWER(COALESCE(t.team_name, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(COALESCE(t.e_team_name, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(COALESCE(t.region_name, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(COALESCE(t.owner, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Team> findByKeyword(@Param("keyword") String keyword);
}
