package site.aiion.api.pathfinder.config;

import java.io.IOException;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import site.aiion.api.pathfinder.PathfinderModel;
import site.aiion.api.pathfinder.PathfinderService;
import site.aiion.api.pathfinder.csv.NanjungCsvBuilder;
import site.aiion.api.pathfinder.csv.NanjungCsvParser;
import site.aiion.api.pathfinder.common.domain.Messenger;

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
public class CsvDataInitializer implements ApplicationRunner {

    private final NanjungCsvParser csvParser;
    private final NanjungCsvBuilder csvBuilder;
    private final PathfinderService pathfinderService;

    // 환경 변수로 초기화 활성화/비활성화 제어 (기본값: true)
    @Value("${csv.init.enabled:true}")
    private boolean csvInitEnabled;

    // 최소 데이터 개수 기준 (이 개수 이상이면 이미 초기화된 것으로 간주)
    @Value("${csv.init.min-count:100}")
    private int minDataCount;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        log.info("=== CSV 데이터 초기화 시작 ===");
        log.info("CSV 초기화 활성화 여부: {}", csvInitEnabled);

        // 1. 환경 변수로 초기화 비활성화 확인
        if (!csvInitEnabled) {
            log.info("CSV 초기화가 비활성화되어 있습니다. (CSV_INIT_ENABLED=false)");
            return;
        }

        // 2. CSV 파일 존재 여부 확인
        if (!csvParser.fileExists()) {
            log.warn("CSV 파일이 존재하지 않습니다. 초기화를 건너뜁니다.");
            return;
        }

        // 3. 이미 데이터가 있는지 확인 (중복 방지) - 더 엄격한 체크
        Messenger findAllResult = pathfinderService.findAll();
        if (findAllResult.getCode() == 200) {
            @SuppressWarnings("unchecked")
            List<PathfinderModel> existingData = (List<PathfinderModel>) findAllResult.getData();
            if (existingData != null && !existingData.isEmpty()) {
                int existingCount = existingData.size();
                log.info("현재 DB에 {}개의 데이터가 존재합니다.", existingCount);
                
                // 최소 개수 기준으로 중복 체크 (기본값: 100개 이상이면 이미 초기화된 것으로 간주)
                if (existingCount >= minDataCount) {
                    log.info("이미 충분한 데이터가 존재합니다 ({} >= {}). CSV 초기화를 건너뜁니다.", 
                            existingCount, minDataCount);
                    return;
                } else {
                    log.warn("데이터가 있지만 최소 개수({}) 미만입니다. CSV 초기화를 진행합니다.", minDataCount);
                }
            }
        }

        try {
            // 3. CSV 파일 파싱
            log.info("CSV 파일 파싱 중...");
            var csvRecords = csvParser.parse();

            if (csvRecords.isEmpty()) {
                log.warn("CSV 파일에 데이터가 없습니다.");
                return;
            }

            // 4. CSVRecord를 PathfinderModel로 변환
            log.info("CSV 데이터를 PathfinderModel로 변환 중...");
            List<PathfinderModel> models = csvBuilder.build(csvRecords);

            if (models.isEmpty()) {
                log.warn("변환된 데이터가 없습니다.");
                return;
            }

            // 5. DB에 일괄 저장
            log.info("{}개의 데이터를 DB에 저장 중...", models.size());
            Messenger saveResult = pathfinderService.saveAll(models);

            if (saveResult.getCode() == 200) {
                log.info("=== CSV 데이터 초기화 완료: {}개 저장됨 ===", models.size());
            } else {
                log.error("=== CSV 데이터 저장 실패: {} ===", saveResult.getMessage());
            }

        } catch (IOException e) {
            log.error("CSV 파일 읽기 실패: {}", e.getMessage(), e);
        } catch (Exception e) {
            log.error("CSV 데이터 초기화 중 오류 발생: {}", e.getMessage(), e);
        }
    }
}

