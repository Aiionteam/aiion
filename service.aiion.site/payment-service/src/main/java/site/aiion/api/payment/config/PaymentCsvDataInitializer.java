package site.aiion.api.payment.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import site.aiion.api.payment.PaymentCsvImportService;
import site.aiion.api.payment.PaymentRepository;

/**
 * 애플리케이션 시작 시 CSV 데이터를 자동으로 DB에 등록하는 초기화 클래스
 * docker-compose up 시 자동 실행됨
 * 
 * 중복 방지:
 * 1. 환경 변수 CSV_INIT_ENABLED=false로 비활성화 가능
 * 2. 이미 데이터가 있으면 자동으로 스킵
 * 3. 최소 데이터 개수 기준으로 중복 체크
 */
@Slf4j
@Component
@Order(1) // 다른 초기화 작업보다 먼저 실행
@RequiredArgsConstructor
public class PaymentCsvDataInitializer implements ApplicationRunner {

    private final PaymentCsvImportService csvImportService;
    private final PaymentRepository paymentRepository;

    // 환경 변수로 초기화 활성화/비활성화 제어 (기본값: true)
    @Value("${csv.init.enabled:true}")
    private boolean csvInitEnabled;

    // 최소 데이터 개수 기준 (이 개수 이상이면 이미 초기화된 것으로 간주)
    @Value("${csv.init.min-count:5}")
    private int minDataCount;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        log.info("=== Payment CSV 데이터 초기화 시작 ===");
        log.info("CSV 초기화 활성화 여부: {}", csvInitEnabled);

        // 1. 환경 변수로 초기화 비활성화 확인
        if (!csvInitEnabled) {
            log.info("CSV 초기화가 비활성화되어 있습니다. (CSV_INIT_ENABLED=false)");
            return;
        }

        // 2. 이미 데이터가 있는지 확인 (중복 방지)
        long existingCount = paymentRepository.count();
        log.info("현재 DB에 저장된 결제 데이터 개수: {}", existingCount);

        if (existingCount >= minDataCount) {
            log.info("이미 데이터가 {}개 이상 있습니다. (최소 기준: {}개) CSV 초기화를 건너뜁니다.", existingCount, minDataCount);
            return;
        }

        try {
            // 3. CSV 파일 import
            log.info("CSV 파일 import 시작: payment_test_data.csv");
            int importedCount = csvImportService.importCsvToDatabase("payment_test_data.csv");

            if (importedCount > 0) {
                log.info("=== Payment CSV 데이터 초기화 완료: {}개 저장됨 ===", importedCount);
            } else {
                log.warn("CSV import 결과: 0개 (파일이 없거나 데이터가 없을 수 있습니다)");
            }

        } catch (Exception e) {
            log.error("=== Payment CSV 데이터 초기화 중 오류 발생: {} ===", e.getMessage(), e);
        }
    }
}

