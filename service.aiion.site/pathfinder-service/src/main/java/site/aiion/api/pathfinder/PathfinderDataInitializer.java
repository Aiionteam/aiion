package site.aiion.api.pathfinder;

import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import site.aiion.api.pathfinder.common.domain.Messenger;

@Slf4j
@Component
@RequiredArgsConstructor
@Order(1)
public class PathfinderDataInitializer implements CommandLineRunner {

    private final PathfinderCsvService pathfinderCsvService;
    private final PathfinderRepository pathfinderRepository;

    @Override
    public void run(String... args) throws Exception {
        try {
            // 이미 데이터가 있는지 확인
            long count = pathfinderRepository.count();
            if (count > 0) {
                log.info("Pathfinder 데이터가 이미 존재합니다. ({}개 레코드) CSV 임포트를 건너뜁니다.", count);
                return;
            }

            log.info("Pathfinder 데이터 초기화 시작...");
            
            // CSV 파일 경로 (컨테이너 내부 경로)
            String csvPath = "/app/nanjung.csv";
            
            // CSV 파일이 존재하는지 확인
            java.io.File csvFile = new java.io.File(csvPath);
            if (!csvFile.exists()) {
                log.warn("CSV 파일을 찾을 수 없습니다: {}. CSV 임포트를 건너뜁니다.", csvPath);
                return;
            }

            // CSV 임포트 실행
            Messenger result = pathfinderCsvService.importCsvToDatabase(csvPath);
            
            if (result.getCode() == 200) {
                log.info("CSV 임포트 성공: {}", result.getMessage());
            } else {
                log.error("CSV 임포트 실패: {}", result.getMessage());
            }
        } catch (Exception e) {
            log.error("CSV 임포트 중 오류 발생: {}", e.getMessage(), e);
        }
    }
}

