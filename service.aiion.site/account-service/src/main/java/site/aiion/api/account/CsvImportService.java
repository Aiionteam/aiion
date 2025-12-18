package site.aiion.api.account;

import java.io.BufferedReader;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.util.ResourceUtils;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class CsvImportService {

    private final AccountRepository accountRepository;
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm:ss");

    /**
     * CSV 파일을 읽어서 데이터베이스에 저장
     * @param filePath CSV 파일 경로 (상대 경로 또는 절대 경로)
     * @param userId 사용자 ID (기본값: 1L)
     * @return 저장된 레코드 수
     */
    public int importCsvToDatabase(String filePath, Long userId) {
        if (userId == null) {
            userId = 1L;
        }

        List<AccountModel> accountList = new ArrayList<>();
        
        try {
            Path path;
            
            // 절대 경로인지 확인
            if (Paths.get(filePath).isAbsolute()) {
                path = Paths.get(filePath);
            } else {
                // 상대 경로인 경우 여러 위치에서 찾기 시도
                // 1. 현재 작업 디렉토리 기준
                path = Paths.get(filePath);
                
                if (!Files.exists(path)) {
                    // 2. classpath에서 찾기
                    try {
                        path = Paths.get(ResourceUtils.getFile("classpath:" + filePath).getAbsolutePath());
                    } catch (Exception e) {
                        // 3. account-service 디렉토리 기준
                        path = Paths.get("service.aiion.site/account-service/src/main/resources/" + filePath);
                        
                        if (!Files.exists(path)) {
                            // 4. 프로젝트 루트 기준
                            path = Paths.get(filePath);
                        }
                    }
                }
            }

            log.info("CSV 파일 읽기 시작: {}", path.toAbsolutePath());

            try (BufferedReader br = Files.newBufferedReader(path)) {
                String line;
                boolean isFirstLine = true;

                while ((line = br.readLine()) != null) {
                    if (isFirstLine) {
                        isFirstLine = false;
                        continue; // 헤더 스킵
                    }

                    if (line.trim().isEmpty()) {
                        continue; // 빈 줄 스킵
                    }

                    AccountModel account = parseCsvLine(line, userId);
                    if (account != null) {
                        accountList.add(account);
                    }
                }
            }

            log.info("CSV 파싱 완료: {} 개의 레코드", accountList.size());

            // 일괄 저장
            if (!accountList.isEmpty()) {
                List<Account> entities = accountList.stream()
                        .map(this::modelToEntity)
                        .filter(entity -> entity != null)
                        .collect(java.util.stream.Collectors.toList());
                accountRepository.saveAll(entities);
                log.info("데이터베이스 저장 완료: {} 개의 레코드", entities.size());
                
                // 전체 조회 검증 (400개 확인)
                long totalCount = accountRepository.count();
                log.info("DB 전체 레코드 수: {} 개 (예상: 400개)", totalCount);
                if (totalCount != 400) {
                    log.warn("⚠️ 전체 조회 개수가 예상과 다릅니다. 예상: 400개, 실제: {} 개", totalCount);
                }
            }

            return accountList.size();

        } catch (IOException e) {
            log.error("CSV 파일 읽기 오류: {}", e.getMessage(), e);
            throw new RuntimeException("CSV 파일 읽기 실패: " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("CSV import 오류: {}", e.getMessage(), e);
            throw new RuntimeException("CSV import 실패: " + e.getMessage(), e);
        }
    }

    /**
     * CSV 한 줄을 파싱하여 AccountModel로 변환
     */
    private AccountModel parseCsvLine(String line, Long userId) {
        try {
            String[] values = parseCsvLine(line);
            
            if (values.length < 11) {
                log.warn("CSV 컬럼 수가 부족합니다. 줄: {}", line);
                return null;
            }

            AccountModel account = AccountModel.builder()
                    .id(null) // 새로 저장할 것이므로 null
                    .transactionDate(parseDate(values[1]))
                    .transactionTime(parseTime(values[2]))
                    .type(values[3])
                    .amount(parseLong(values[4]))
                    .category(values[5])
                    .paymentMethod(values[6])
                    .location(values[7])
                    .description(values[8])
                    .vatAmount(parseDouble(values[9]))
                    .incomeSource(values.length > 10 && !values[10].isEmpty() ? values[10] : null)
                    .userId(userId)
                    .build();

            return account;

        } catch (Exception e) {
            log.error("CSV 라인 파싱 오류: {} - {}", line, e.getMessage());
            return null;
        }
    }

    /**
     * CSV 라인을 파싱 (쉼표로 구분, 따옴표 처리)
     */
    private String[] parseCsvLine(String line) {
        List<String> values = new ArrayList<>();
        boolean inQuotes = false;
        StringBuilder currentValue = new StringBuilder();

        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);

            if (c == '"') {
                inQuotes = !inQuotes;
            } else if (c == ',' && !inQuotes) {
                values.add(currentValue.toString().trim());
                currentValue = new StringBuilder();
            } else {
                currentValue.append(c);
            }
        }
        values.add(currentValue.toString().trim());

        return values.toArray(new String[0]);
    }

    private LocalDate parseDate(String dateStr) {
        if (dateStr == null || dateStr.isEmpty()) {
            return null;
        }
        try {
            return LocalDate.parse(dateStr.trim(), DATE_FORMATTER);
        } catch (Exception e) {
            log.warn("날짜 파싱 실패: {}", dateStr);
            return null;
        }
    }

    private LocalTime parseTime(String timeStr) {
        if (timeStr == null || timeStr.isEmpty()) {
            return null;
        }
        try {
            return LocalTime.parse(timeStr.trim(), TIME_FORMATTER);
        } catch (Exception e) {
            log.warn("시간 파싱 실패: {}", timeStr);
            return null;
        }
    }

    private Long parseLong(String longStr) {
        if (longStr == null || longStr.isEmpty()) {
            return null;
        }
        try {
            return Long.parseLong(longStr.trim());
        } catch (Exception e) {
            log.warn("Long 파싱 실패: {}", longStr);
            return null;
        }
    }

    private Double parseDouble(String doubleStr) {
        if (doubleStr == null || doubleStr.isEmpty()) {
            return null;
        }
        try {
            return Double.parseDouble(doubleStr.trim());
        } catch (Exception e) {
            log.warn("Double 파싱 실패: {}", doubleStr);
            return null;
        }
    }

    /**
     * AccountModel을 Account 엔티티로 변환
     */
    private Account modelToEntity(AccountModel model) {
        return Account.builder()
                .id(model.getId())
                .transactionDate(model.getTransactionDate())
                .transactionTime(model.getTransactionTime())
                .type(model.getType())
                .amount(model.getAmount())
                .category(model.getCategory())
                .paymentMethod(model.getPaymentMethod())
                .location(model.getLocation())
                .description(model.getDescription())
                .vatAmount(model.getVatAmount())
                .incomeSource(model.getIncomeSource())
                .userId(model.getUserId() != null ? model.getUserId() : 1L)
                .build();
    }
}

