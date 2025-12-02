package site.aiion.api.soccer.schedule;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ScheduleRepository extends JpaRepository<Schedule, Long> {
    
    /**
     * 검색어로 일정 검색 (날짜, 구분, 팀명에서 검색)
     */
    @Query("SELECT s FROM Schedule s WHERE " +
           "COALESCE(s.sche_date, '') LIKE CONCAT('%', :keyword, '%') OR " +
           "LOWER(COALESCE(s.gubun, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "COALESCE(s.hometeam_uk, '') LIKE CONCAT('%', :keyword, '%') OR " +
           "COALESCE(s.awayteam_uk, '') LIKE CONCAT('%', :keyword, '%')")
    List<Schedule> findByKeyword(@Param("keyword") String keyword);
}

