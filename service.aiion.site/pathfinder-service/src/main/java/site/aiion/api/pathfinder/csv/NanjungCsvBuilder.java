package site.aiion.api.pathfinder.csv;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Component;

import lombok.extern.slf4j.Slf4j;
import site.aiion.api.pathfinder.PathfinderModel;

/**
 * CSVRecord를 PathfinderModel로 변환하는 빌더
 * null 값 방지 및 데이터 정제 로직 포함
 */
@Slf4j
@Component
public class NanjungCsvBuilder {

    private static final Pattern TITLE_PATTERN = Pattern.compile("<([^>]+)>");
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    /**
     * CSVRecord 리스트를 PathfinderModel 리스트로 변환
     * 
     * @param records CSV 레코드 리스트
     * @return PathfinderModel 리스트 (null 값 없이 깔끔하게 처리됨)
     */
    public List<PathfinderModel> build(List<CSVRecord> records) {
        List<PathfinderModel> models = new ArrayList<>();
        int successCount = 0;
        int skipCount = 0;

        for (CSVRecord record : records) {
            try {
                Optional<PathfinderModel> model = buildSingle(record);
                if (model.isPresent()) {
                    models.add(model.get());
                    successCount++;
                } else {
                    skipCount++;
                    log.warn("레코드 스킵 (인덱스 {}): 필수 필드 누락", record.getRecordNumber());
                }
            } catch (Exception e) {
                skipCount++;
                log.error("레코드 변환 실패 (인덱스 {}): {}", record.getRecordNumber(), e.getMessage());
            }
        }

        log.info("CSV 변환 완료: 성공 {}개, 스킵 {}개", successCount, skipCount);
        return models;
    }

    /**
     * 단일 CSVRecord를 PathfinderModel로 변환
     * 
     * @param record CSV 레코드
     * @return PathfinderModel (Optional - 변환 실패 시 empty)
     */
    private Optional<PathfinderModel> buildSingle(CSVRecord record) {
        try {
            // 1. 날짜 파싱 (필수 필드)
            LocalDateTime createdAt = parseDate(record.get("localdate"))
                    .orElse(null);
            
            if (createdAt == null) {
                log.warn("날짜 파싱 실패 (인덱스 {}): {}", record.getRecordNumber(), record.get("localdate"));
                return Optional.empty();
            }

            // 2. 제목 추출 (꺾쇠괄호에서 추출)
            String title = extractTitle(record.get("title"))
                    .orElse(generateTitleFromDate(createdAt));

            // 3. 내용 추출 (null 방지)
            String description = extractContent(record.get("content"))
                    .orElse("");

            // 4. 사용자 ID 파싱 (필수 필드)
            Long userId = parseUserId(record.get("userId"))
                    .orElse(null);

            if (userId == null) {
                log.warn("사용자 ID 파싱 실패 (인덱스 {}): {}", record.getRecordNumber(), record.get("userId"));
                return Optional.empty();
            }

            // 5. PathfinderModel 생성 (null 값 없이)
            PathfinderModel model = PathfinderModel.builder()
                    .id(null) // ID는 DB에서 자동 생성
                    .createdAt(createdAt) // 필수: null 불가
                    .title(title) // 기본값 처리됨
                    .description(description) // 빈 문자열로 처리됨
                    .userId(userId) // 필수: null 불가
                    .build();

            return Optional.of(model);

        } catch (Exception e) {
            log.error("레코드 변환 중 예외 발생 (인덱스 {}): {}", record.getRecordNumber(), e.getMessage(), e);
            return Optional.empty();
        }
    }

    /**
     * 날짜 문자열을 LocalDateTime으로 파싱
     * 형식: '1592-02-13 또는 1592-02-13
     * 
     * @param dateStr 날짜 문자열
     * @return LocalDateTime (파싱 실패 시 empty)
     */
    private Optional<LocalDateTime> parseDate(String dateStr) {
        if (dateStr == null || dateStr.trim().isEmpty()) {
            return Optional.empty();
        }

        try {
            // 작은따옴표 제거 및 공백 제거
            String cleaned = dateStr.trim().replace("'", "").replace("\"", "");
            
            // 날짜 파싱 (시간은 00:00:00으로 설정)
            LocalDate date = LocalDate.parse(cleaned, DATE_FORMATTER);
            LocalDateTime dateTime = date.atStartOfDay();
            
            return Optional.of(dateTime);
        } catch (DateTimeParseException e) {
            log.warn("날짜 파싱 실패: {}", dateStr);
            return Optional.empty();
        }
    }

    /**
     * 제목에서 꺾쇠괄호 내용 추출
     * 형식: <임술> → "임술"
     * 
     * @param titleStr 제목 문자열
     * @return 추출된 제목 (없으면 empty)
     */
    private Optional<String> extractTitle(String titleStr) {
        if (titleStr == null || titleStr.trim().isEmpty()) {
            return Optional.empty();
        }

        Matcher matcher = TITLE_PATTERN.matcher(titleStr);
        if (matcher.find()) {
            String extracted = matcher.group(1).trim();
            return extracted.isEmpty() ? Optional.empty() : Optional.of(extracted);
        }

        // 꺾쇠괄호가 없으면 원본 문자열 반환 (공백 제거)
        String cleaned = titleStr.trim();
        return cleaned.isEmpty() ? Optional.empty() : Optional.of(cleaned);
    }

    /**
     * 날짜로부터 기본 제목 생성
     * 
     * @param dateTime 날짜
     * @return 생성된 제목
     */
    private String generateTitleFromDate(LocalDateTime dateTime) {
        return "기록 " + dateTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
    }

    /**
     * 내용 추출 및 정제
     * 
     * @param contentStr 내용 문자열
     * @return 정제된 내용 (null이면 empty)
     */
    private Optional<String> extractContent(String contentStr) {
        if (contentStr == null) {
            return Optional.empty();
        }

        String cleaned = contentStr.trim();
        
        // 빈 문자열이면 empty 반환
        if (cleaned.isEmpty()) {
            return Optional.empty();
        }

        return Optional.of(cleaned);
    }

    /**
     * 사용자 ID 파싱
     * 
     * @param userIdStr 사용자 ID 문자열
     * @return Long 타입 사용자 ID (파싱 실패 시 empty)
     */
    private Optional<Long> parseUserId(String userIdStr) {
        if (userIdStr == null || userIdStr.trim().isEmpty()) {
            return Optional.empty();
        }

        try {
            Long userId = Long.parseLong(userIdStr.trim());
            return Optional.of(userId);
        } catch (NumberFormatException e) {
            log.warn("사용자 ID 파싱 실패: {}", userIdStr);
            return Optional.empty();
        }
    }
}

