package site.aiion.api.soccer.stadium;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface StadiumRepository extends JpaRepository<Stadium, Long> {
    @Query("SELECT s FROM Stadium s WHERE s.stadium_uk = :stadiumUk")
    Optional<Stadium> findByStadium_uk(@Param("stadiumUk") String stadiumUk);
    
    /**
     * 검색어로 경기장 검색 (경기장명, 주소에서 검색)
     */
    @Query("SELECT s FROM Stadium s WHERE " +
           "LOWER(COALESCE(s.stadium_name, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(COALESCE(s.address, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Stadium> findByKeyword(@Param("keyword") String keyword);
}

