package site.aiion.api.pathfinder;

import java.util.List;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import site.aiion.api.pathfinder.common.domain.Messenger;

@RestController
@RequiredArgsConstructor
@RequestMapping("/pathfinders")
@Tag(name = "01. Pathfinder", description = "경로 탐색 관리 기능")
public class PathfinderController {

    private final PathfinderService pathfinderService;
    private final PathfinderAnalysisService pathfinderAnalysisService;

    @PostMapping("/findById")
    @Operation(summary = "경로 탐색 ID로 조회", description = "경로 탐색 ID를 받아 해당 경로 탐색 정보를 조회합니다.")
    public Messenger findById(@RequestBody PathfinderModel pathfinderModel) {
        return pathfinderService.findById(pathfinderModel);
    }

    @GetMapping
    @Operation(summary = "전체 경로 탐색 조회", description = "모든 경로 탐색 정보를 조회합니다.")
    public Messenger findAll() {
        return pathfinderService.findAll();
    }

    @GetMapping("/user/{userId}")
    @Operation(summary = "사용자별 경로 탐색 조회", description = "특정 사용자의 경로 탐색 정보를 조회합니다.")
    public Messenger findByUserId(@org.springframework.web.bind.annotation.PathVariable Long userId) {
        return pathfinderService.findByUserId(userId);
    }

    @GetMapping("/check/{userId}")
    @Operation(summary = "사용자별 경로 탐색 연결 확인", description = "특정 사용자의 경로 탐색 연결 상태를 확인합니다.")
    public Messenger checkUserPathfinderConnection(@org.springframework.web.bind.annotation.PathVariable Long userId) {
        return pathfinderService.findByUserId(userId);
    }

    @PostMapping
    @Operation(summary = "경로 탐색 저장", description = "새로운 경로 탐색 정보를 저장합니다.")
    public Messenger save(@RequestBody PathfinderModel pathfinderModel) {
        System.out.println("[PathfinderController] 저장 요청 수신:");
        System.out.println("  - id: " + pathfinderModel.getId());
        System.out.println("  - createdAt: " + pathfinderModel.getCreatedAt());
        System.out.println("  - title: " + pathfinderModel.getTitle());
        System.out.println("  - description: " + (pathfinderModel.getDescription() != null ? pathfinderModel.getDescription().length() + "자" : "null"));
        System.out.println("  - userId: " + pathfinderModel.getUserId());
        return pathfinderService.save(pathfinderModel);
    }

    @PostMapping("/saveAll")
    @Operation(summary = "경로 탐색 일괄 저장", description = "여러 경로 탐색 정보를 한 번에 저장합니다.")
    public Messenger saveAll(@RequestBody List<PathfinderModel> pathfinderModelList) {
        return pathfinderService.saveAll(pathfinderModelList);
    }

    @PutMapping
    @Operation(summary = "경로 탐색 수정", description = "기존 경로 탐색 정보를 수정합니다.")
    public Messenger update(@RequestBody PathfinderModel pathfinderModel) {
        return pathfinderService.update(pathfinderModel);
    }

    @DeleteMapping
    @Operation(summary = "경로 탐색 삭제", description = "경로 탐색 정보를 삭제합니다.")
    public Messenger delete(@RequestBody PathfinderModel pathfinderModel) {
        return pathfinderService.delete(pathfinderModel);
    }


    @GetMapping("/recommendations/{userId}")
    @Operation(summary = "학습 추천 조회", description = "사용자의 일기 데이터를 분석하여 학습 주제를 추천합니다.")
    public Messenger getRecommendations(@org.springframework.web.bind.annotation.PathVariable Long userId) {
        try {
            PathfinderAnalysisService.ComprehensiveRecommendation comprehensive = 
                pathfinderAnalysisService.generateComprehensiveRecommendations(userId);
            
            return Messenger.builder()
                    .code(200)
                    .message("학습 추천 조회 성공: " + comprehensive.getRecommendations().size() + "개")
                    .data(comprehensive)
                    .build();
        } catch (Exception e) {
            return Messenger.builder()
                    .code(500)
                    .message("학습 추천 조회 실패: " + e.getMessage())
                    .build();
        }
    }

    @GetMapping("/recommendations/{userId}/simple")
    @Operation(summary = "간단 학습 추천 조회", description = "기본 학습 추천 목록만 반환합니다.")
    public Messenger getSimpleRecommendations(@org.springframework.web.bind.annotation.PathVariable Long userId) {
        try {
            List<PathfinderAnalysisService.LearningRecommendation> recommendations = 
                pathfinderAnalysisService.analyzeDiariesAndExtractLearningTopics(userId);
            
            return Messenger.builder()
                    .code(200)
                    .message("학습 추천 조회 성공: " + recommendations.size() + "개")
                    .data(recommendations)
                    .build();
        } catch (Exception e) {
            return Messenger.builder()
                    .code(500)
                    .message("학습 추천 조회 실패: " + e.getMessage())
                    .build();
        }
    }

}
