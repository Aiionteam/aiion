package site.aiion.api.healthcare;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_scan_documents")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserScanDocument {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "doc_id")
    private Long docId;

    // 사용자 ID (Long) - User 테이블의 id와 매핑
    @Column(name = "user_id", nullable = false)
    private Long userId;

    // 문서 종류 (인바디, 건강검진, 진단서 등)
    @Column(name = "doc_type", length = 50)
    private String docType;

    // 업로드 시각
    @Column(name = "uploaded_at", nullable = false)
    private LocalDateTime uploadedAt;

    // OCR/AI로 추출된 주요 정보 (JSON 문자열)
    @Column(name = "parsed_data", columnDefinition = "jsonb")
    private String parsedData;

    // 병원 추천 또는 질병 추정 결과
    @Column(name = "hospital_suggestion", columnDefinition = "TEXT")
    private String hospitalSuggestion;
}

