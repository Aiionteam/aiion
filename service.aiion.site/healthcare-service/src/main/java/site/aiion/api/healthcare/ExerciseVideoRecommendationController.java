package site.aiion.api.healthcare;

import java.util.List;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import site.aiion.api.healthcare.common.domain.Messenger;
import site.aiion.api.healthcare.util.JwtTokenUtil;

@RestController
@RequestMapping("/exercise-video-recommendations")
@RequiredArgsConstructor
@Tag(name = "06. Exercise Video Recommendations", description = "운동 영상 추천 관리 기능")
public class ExerciseVideoRecommendationController {

    private final ExerciseVideoRecommendationService exerciseVideoRecommendationService;
    private final JwtTokenUtil jwtTokenUtil;

    @PostMapping("/findById")
    @Operation(summary = "운동 영상 추천 ID로 조회", description = "운동 영상 추천 ID를 받아 해당 추천 정보를 조회합니다.")
    public Messenger findById(@RequestBody ExerciseVideoRecommendationModel exerciseVideoRecommendationModel) {
        return exerciseVideoRecommendationService.findById(exerciseVideoRecommendationModel);
    }

    @GetMapping("/user/{userId}")
    @Operation(summary = "사용자별 운동 영상 추천 조회", description = "특정 사용자의 운동 영상 추천 정보를 조회합니다.")
    public Messenger findByUserId(
            @org.springframework.web.bind.annotation.PathVariable Long userId) {
        return exerciseVideoRecommendationService.findByUserId(userId);
    }

    @GetMapping("/user")
    @Operation(summary = "JWT 토큰 기반 운동 영상 추천 조회", description = "JWT 토큰에서 사용자 ID를 추출하여 운동 영상 추천을 조회합니다.")
    public Messenger findByUserFromToken(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return Messenger.builder()
                    .code(401)
                    .message("인증 토큰이 필요합니다.")
                    .build();
        }

        String token = jwtTokenUtil.extractTokenFromHeader(authHeader);
        if (token == null) {
            return Messenger.builder()
                    .code(401)
                    .message("인증 토큰이 필요합니다.")
                    .build();
        }

        Long userId = jwtTokenUtil.getUserIdFromToken(token);
        if (userId == null) {
            return Messenger.builder()
                    .code(401)
                    .message("토큰에서 사용자 ID를 추출할 수 없습니다.")
                    .build();
        }

        return exerciseVideoRecommendationService.findByUserId(userId);
    }

    @PostMapping
    @Operation(summary = "운동 영상 추천 저장", description = "새로운 운동 영상 추천을 저장합니다.")
    public Messenger save(@RequestBody ExerciseVideoRecommendationModel exerciseVideoRecommendationModel) {
        return exerciseVideoRecommendationService.save(exerciseVideoRecommendationModel);
    }

    @PostMapping("/batch")
    @Operation(summary = "운동 영상 추천 일괄 저장", description = "여러 운동 영상 추천을 한 번에 저장합니다.")
    public Messenger saveAll(@RequestBody List<ExerciseVideoRecommendationModel> exerciseVideoRecommendationModelList) {
        return exerciseVideoRecommendationService.saveAll(exerciseVideoRecommendationModelList);
    }

    @PutMapping
    @Operation(summary = "운동 영상 추천 수정", description = "기존 운동 영상 추천을 수정합니다.")
    public Messenger update(@RequestBody ExerciseVideoRecommendationModel exerciseVideoRecommendationModel) {
        return exerciseVideoRecommendationService.update(exerciseVideoRecommendationModel);
    }

    @DeleteMapping
    @Operation(summary = "운동 영상 추천 삭제", description = "운동 영상 추천을 삭제합니다.")
    public Messenger delete(@RequestBody ExerciseVideoRecommendationModel exerciseVideoRecommendationModel) {
        return exerciseVideoRecommendationService.delete(exerciseVideoRecommendationModel);
    }
}

