package site.aiion.api.healthcare;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserScanDocumentRepository extends JpaRepository<UserScanDocument, Long> {
    // userId로 조회
    List<UserScanDocument> findByUserId(Long userId);

    // userId와 docType으로 조회
    List<UserScanDocument> findByUserIdAndDocType(Long userId, String docType);

    // 특정 날짜 범위로 조회
    List<UserScanDocument> findByUserIdAndUploadedAtBetween(Long userId, LocalDateTime startDate, LocalDateTime endDate);
}

