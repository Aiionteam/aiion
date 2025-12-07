package site.aiion.api.payment;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.util.ResourceUtils;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentCsvImportService {

    private final PaymentRepository paymentRepository;
    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    /**
     * CSV 파일을 읽어서 데이터베이스에 저장
     * @param filePath CSV 파일 경로
     * @return 저장된 레코드 수
     */
    @Transactional
    public int importCsvToDatabase(String filePath) {
        List<Payment> paymentList = new ArrayList<>();
        
        try {
            InputStream inputStream = getCsvInputStream(filePath);
            
            log.info("[PaymentCsvImportService] CSV 파일 읽기 시작: {}", filePath);

            try (BufferedReader br = new BufferedReader(
                    new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
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

                    Payment payment = parseCsvLine(line);
                    if (payment != null) {
                        paymentList.add(payment);
                    }
                }
            }

            log.info("[PaymentCsvImportService] CSV 파싱 완료: {} 개의 레코드", paymentList.size());

            // 일괄 저장
            if (!paymentList.isEmpty()) {
                paymentRepository.saveAll(paymentList);
                log.info("[PaymentCsvImportService] 데이터베이스 저장 완료: {} 개의 레코드", paymentList.size());
            }

            return paymentList.size();

        } catch (IOException e) {
            log.error("[PaymentCsvImportService] CSV 파일 읽기 오류: {}", e.getMessage(), e);
            throw new RuntimeException("CSV 파일 읽기 실패: " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("[PaymentCsvImportService] CSV import 오류: {}", e.getMessage(), e);
            throw new RuntimeException("CSV import 실패: " + e.getMessage(), e);
        }
    }

    /**
     * CSV 파일을 InputStream으로 읽기 (JAR 내부 리소스 지원)
     */
    private InputStream getCsvInputStream(String filePath) throws IOException {
        // 1. classpath에서 찾기 (JAR 내부 리소스)
        try {
            Resource resource = new ClassPathResource(filePath);
            if (resource.exists()) {
                log.info("[PaymentCsvImportService] classpath에서 CSV 파일 찾음: {}", filePath);
                return resource.getInputStream();
            }
        } catch (Exception e) {
            log.debug("[PaymentCsvImportService] classpath에서 찾기 실패: {}", e.getMessage());
        }
        
        // 2. 파일 시스템에서 찾기 (개발 환경)
        Path path = Paths.get(filePath);
        if (Files.exists(path)) {
            log.info("[PaymentCsvImportService] 파일 시스템에서 CSV 파일 찾음: {}", path.toAbsolutePath());
            return Files.newInputStream(path);
        }
        
        // 3. 상대 경로로 시도
        path = Paths.get("service.aiion.site/payment-service/src/main/resources/" + filePath);
        if (Files.exists(path)) {
            log.info("[PaymentCsvImportService] 상대 경로에서 CSV 파일 찾음: {}", path.toAbsolutePath());
            return Files.newInputStream(path);
        }
        
        throw new IOException("CSV 파일을 찾을 수 없습니다: " + filePath);
    }

    /**
     * CSV 한 줄을 파싱하여 Payment 엔티티로 변환
     * CSV 형식: payment_id,order_id,user_id,amount,subscription_type,status,payment_key,approved_at,cancelled_at,expires_at,subscription_cancelled_at
     */
    private Payment parseCsvLine(String line) {
        try {
            // CSV 파싱 (쉼표로 분리, 빈 값도 포함)
            List<String> values = new ArrayList<>();
            boolean inQuotes = false;
            StringBuilder currentValue = new StringBuilder();
            
            for (char c : line.toCharArray()) {
                if (c == '"') {
                    inQuotes = !inQuotes;
                } else if (c == ',' && !inQuotes) {
                    values.add(currentValue.toString().trim());
                    currentValue = new StringBuilder();
                } else {
                    currentValue.append(c);
                }
            }
            values.add(currentValue.toString().trim()); // 마지막 값 추가
            
            if (values.size() < 10) {
                log.warn("[PaymentCsvImportService] CSV 라인 파싱 실패 (컬럼 수 부족: {}개, 예상: 최소 10개): {}", values.size(), line);
                return null;
            }

            // 안전한 값 추출 함수
            java.util.function.Function<Integer, String> getValue = (index) -> {
                if (index < values.size()) {
                    String val = values.get(index).trim();
                    return val.isEmpty() ? null : val;
                }
                return null;
            };

            Payment.PaymentBuilder builder = Payment.builder()
                    .paymentId(getValue.apply(0))
                    .orderId(getValue.apply(1))
                    .userId(Long.parseLong(getValue.apply(2)))
                    .amount(Long.parseLong(getValue.apply(3)))
                    .subscriptionType(getValue.apply(4))
                    .featureType(null)  // feature_type 컬럼 제거됨
                    .status(getValue.apply(5))
                    .paymentKey(getValue.apply(6));

            // 날짜 파싱
            String approvedAtStr = getValue.apply(7);
            if (approvedAtStr != null && !approvedAtStr.isEmpty()) {
                builder.approvedAt(LocalDateTime.parse(approvedAtStr, DATETIME_FORMATTER));
            }
            
            String cancelledAtStr = getValue.apply(8);
            if (cancelledAtStr != null && !cancelledAtStr.isEmpty()) {
                builder.cancelledAt(LocalDateTime.parse(cancelledAtStr, DATETIME_FORMATTER));
            }
            
            String expiresAtStr = getValue.apply(9);
            if (expiresAtStr != null && !expiresAtStr.isEmpty()) {
                builder.expiresAt(LocalDateTime.parse(expiresAtStr, DATETIME_FORMATTER));
            }
            
            // subscription_cancelled_at 파싱 (11번째 컬럼, 인덱스 10)
            String subscriptionCancelledAtStr = getValue.apply(10);
            if (subscriptionCancelledAtStr != null && !subscriptionCancelledAtStr.isEmpty()) {
                builder.subscriptionCancelledAt(LocalDateTime.parse(subscriptionCancelledAtStr, DATETIME_FORMATTER));
            }

            Payment payment = builder.build();
            log.debug("[PaymentCsvImportService] 파싱된 Payment: paymentId={}, orderId={}, userId={}, amount={}, status={}", 
                    payment.getPaymentId(), payment.getOrderId(), payment.getUserId(), payment.getAmount(), payment.getStatus());
            
            return payment;

        } catch (Exception e) {
            log.error("[PaymentCsvImportService] CSV 라인 파싱 오류: {} - {}", line, e.getMessage(), e);
            return null;
        }
    }

    /**
     * 모든 결제 데이터 삭제 (테스트용)
     */
    @Transactional
    public void deleteAllPayments() {
        paymentRepository.deleteAll();
        log.info("[PaymentCsvImportService] 모든 결제 데이터 삭제 완료");
    }
}

