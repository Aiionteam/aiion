package site.aiion.api.pathfinder;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import site.aiion.api.pathfinder.common.domain.Messenger;

@Service
@RequiredArgsConstructor
public class PathfinderCsvService {

    private final PathfinderService pathfinderService;

    /**
     * CSV 파일을 파싱하여 PathfinderModel 배열로 변환
     * 
     * @param filePath CSV 파일 경로
     * @return PathfinderModel 리스트
     */
    public List<PathfinderModel> parseCsvFile(String filePath) throws IOException {
        List<PathfinderModel> pathfinderList = new ArrayList<>();

        try (BufferedReader br = new BufferedReader(
                new FileReader(filePath, java.nio.charset.StandardCharsets.UTF_8))) {
            String line;
            boolean isFirstLine = true;
            StringBuilder currentContent = new StringBuilder();
            String currentDate = null;
            String currentTitle = null;
            String currentUserId = null;
            boolean inQuotedContent = false;
            boolean isNewRecord = false;

            while ((line = br.readLine()) != null) {
                // 첫 번째 줄은 헤더이므로 스킵
                if (isFirstLine) {
                    isFirstLine = false;
                    continue;
                }

                // 빈 줄은 스킵
                if (line.trim().isEmpty()) {
                    continue;
                }

                // 숫자로 시작하는 줄은 새로운 레코드의 시작 (id 필드)
                // 형식: id,localdate,title,content,userId
                // 예: 1,'1592-02-13,<임술>,"맑다.\n..."
                if (line.matches("^\\d+,") || isNewRecord) {
                    // 이전 레코드가 있으면 저장
                    if (currentDate != null && currentTitle != null && currentUserId != null) {
                        PathfinderModel model = createPathfinderModel(
                                currentDate,
                                currentTitle,
                                currentContent.toString().trim(),
                                currentUserId);
                        if (model != null) {
                            pathfinderList.add(model);
                        }
                    }

                    // 새 레코드 시작
                    currentContent = new StringBuilder();
                    inQuotedContent = false;
                    isNewRecord = false;

                    // id 필드 건너뛰기 (첫 번째 콤마까지)
                    int firstComma = line.indexOf(',');
                    if (firstComma > 0) {
                        String remaining = line.substring(firstComma + 1);

                        // localdate와 title은 함께 있음: '1592-02-13,<임술>
                        // 작은따옴표로 시작하고, 콤마로 구분됨
                        if (remaining.startsWith("'")) {
                            // 작은따옴표 제거
                            String withoutQuote = remaining.substring(1);

                            // localdate와 title 사이의 콤마 찾기
                            int dateTitleComma = withoutQuote.indexOf(',');
                            if (dateTitleComma > 0) {
                                // localdate 추출 (작은따옴표는 이미 제거됨)
                                currentDate = withoutQuote.substring(0, dateTitleComma).trim();

                                // title 추출
                                String afterDate = withoutQuote.substring(dateTitleComma + 1);
                                int titleContentComma = afterDate.indexOf(',');
                                if (titleContentComma > 0) {
                                    currentTitle = afterDate.substring(0, titleContentComma).trim();

                                    // content 시작 확인 (큰따옴표로 시작하는지)
                                    String contentPart = afterDate.substring(titleContentComma + 1);
                                    if (contentPart.startsWith("\"")) {
                                        inQuotedContent = true;
                                        // 첫 번째 큰따옴표 제거하고 시작
                                        String contentStart = contentPart.substring(1);

                                        // 같은 줄에서 큰따옴표가 닫히는지 확인
                                        int closingQuoteIndex = contentStart.indexOf("\",");
                                        if (closingQuoteIndex >= 0) {
                                            // 같은 줄에서 닫힘
                                            currentContent.append(contentStart.substring(0, closingQuoteIndex));
                                            // userId 추출
                                            currentUserId = contentStart.substring(closingQuoteIndex + 2).trim();
                                            inQuotedContent = false;
                                        } else {
                                            // 다음 줄로 계속
                                            currentContent.append(contentStart);
                                        }
                                    } else {
                                        // 큰따옴표가 없으면 일반 콘텐츠
                                        int fourthComma = contentPart.indexOf(',');
                                        if (fourthComma > 0) {
                                            currentContent.append(contentPart.substring(0, fourthComma));
                                            currentUserId = contentPart.substring(fourthComma + 1).trim();
                                            inQuotedContent = false;
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else if (inQuotedContent) {
                    // 큰따옴표 안의 내용 계속 읽기
                    // 큰따옴표와 콤마로 끝나는지 확인 (",)
                    if (line.endsWith("\",")) {
                        // 큰따옴표로 끝나는 경우
                        currentContent.append("\n").append(line.substring(0, line.length() - 2));
                        // userId 추출
                        currentUserId = line.substring(line.length() - 1).trim();
                        inQuotedContent = false;
                    } else if (line.contains("\",")) {
                        // 줄 중간에 큰따옴표와 콤마가 있는 경우
                        int quoteCommaIndex = line.indexOf("\",");
                        currentContent.append("\n").append(line.substring(0, quoteCommaIndex));
                        // userId 추출
                        currentUserId = line.substring(quoteCommaIndex + 2).trim();
                        inQuotedContent = false;
                    } else {
                        // 계속 읽기
                        currentContent.append("\n").append(line);
                    }
                } else {
                    // 예상치 못한 형식 - 새 레코드로 간주
                    isNewRecord = true;
                }
            }

            // 마지막 레코드 저장
            if (currentDate != null && currentTitle != null && currentUserId != null) {
                PathfinderModel model = createPathfinderModel(
                        currentDate,
                        currentTitle,
                        currentContent.toString().trim(),
                        currentUserId);
                if (model != null) {
                    pathfinderList.add(model);
                }
            }
        }

        return pathfinderList;
    }

    /**
     * PathfinderModel 생성
     */
    private PathfinderModel createPathfinderModel(String dateStr, String title, String content, String userIdStr) {
        try {
            // 날짜 파싱 (작은따옴표 제거 및 형식 변환)
            String cleanDate = dateStr.replace("'", "").trim();
            LocalDate localDate = LocalDate.parse(cleanDate, DateTimeFormatter.ISO_LOCAL_DATE);
            LocalDateTime createdAt = localDate.atStartOfDay();

            // title 정리 (괄호 제거 등)
            String cleanTitle = title.replace("<", "").replace(">", "").trim();

            // userId 파싱
            Long userId = Long.parseLong(userIdStr.trim());

            return PathfinderModel.builder()
                    .createdAt(createdAt)
                    .title(cleanTitle.isEmpty() ? "제목 없음" : cleanTitle)
                    .description(content)
                    .userId(userId)
                    .build();
        } catch (Exception e) {
            System.err.println("파싱 오류 - date: " + dateStr + ", title: " + title + ", userId: " + userIdStr);
            System.err.println("오류 메시지: " + e.getMessage());
            return null;
        }
    }

    /**
     * CSV 파일을 읽어서 DB에 저장
     * 
     * @param filePath CSV 파일 경로
     * @return Messenger 응답
     */
    @Transactional
    public Messenger importCsvToDatabase(String filePath) {
        try {
            // CSV 파일 파싱
            List<PathfinderModel> pathfinderList = parseCsvFile(filePath);

            if (pathfinderList.isEmpty()) {
                return Messenger.builder()
                        .Code(400)
                        .message("CSV 파일에서 데이터를 읽을 수 없습니다.")
                        .build();
            }

            // 배열을 사용하여 일괄 저장
            Messenger result = pathfinderService.saveAll(pathfinderList);

            return Messenger.builder()
                    .Code(200)
                    .message("CSV 파일 임포트 성공: " + pathfinderList.size() + "개 레코드 저장됨")
                    .data(result)
                    .build();

        } catch (IOException e) {
            return Messenger.builder()
                    .Code(500)
                    .message("CSV 파일 읽기 오류: " + e.getMessage())
                    .build();
        } catch (Exception e) {
            return Messenger.builder()
                    .Code(500)
                    .message("CSV 임포트 오류: " + e.getMessage())
                    .build();
        }
    }
}
