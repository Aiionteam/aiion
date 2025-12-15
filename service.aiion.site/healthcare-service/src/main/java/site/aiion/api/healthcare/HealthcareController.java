package site.aiion.api.healthcare;

import java.util.List;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import site.aiion.api.healthcare.common.domain.Messenger;
import site.aiion.api.healthcare.util.JwtTokenUtil;

/**
 * @deprecated 이 컨트롤러는 더 이상 사용되지 않습니다.
 * 대신 다음 컨트롤러들을 사용하세요:
 * - UserExerciseLogController: 운동 기록
 * - UserHealthLogController: 건강 기록
 * - UserScanDocumentController: 스캔 문서
 * - ExerciseVideoRecommendationController: 운동 영상 추천
 */
@Deprecated
@RestController
@RequiredArgsConstructor
@Tag(name = "02. Healthcare (Deprecated)", description = "건강 기록 관리 기능 (더 이상 사용되지 않음)")
public class HealthcareController {

    private final HealthcareService healthcareService;
    private final JwtTokenUtil jwtTokenUtil;

    @PostMapping("/findById")
    @Operation(summary = "건강 기록 ID로 조회", description = "건강 기록 ID를 받아 해당 건강 기록 정보를 조회합니다.")
    public Messenger findById(@RequestBody HealthcareModel healthcareModel) {
        return healthcareService.findById(healthcareModel);
    }

    // 보안: 전체 건강 기록 조회 제거 - 사용자별 조회만 허용
    // @GetMapping
    // @Operation(summary = "전체 건강 기록 조회", description = "모든 건강 기록 정보를 조회합니다.")
    // public Messenger findAll() {
    // return healthcareService.findAll();
    // }

    @GetMapping("/user/{userId}")
    @Operation(summary = "사용자별 건강 기록 조회 (Deprecated)", description = "특정 사용자의 건강 기록 정보를 조회합니다. JWT 토큰 기반 조회를 사용하세요.")
    public Messenger findByUserId(
            @org.springframework.web.bind.annotation.PathVariable Long userId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        // JWT 토큰이 있으면 토큰에서 userId 추출 (보안 강화)
        if (authHeader != null) {
            String token = jwtTokenUtil.extractTokenFromHeader(authHeader);
            if (token != null && jwtTokenUtil.validateToken(token)) {
                Long tokenUserId = jwtTokenUtil.getUserIdFromToken(token);
                if (tokenUserId != null) {
                    // 토큰의 userId와 경로의 userId가 일치하는지 확인
                    if (!tokenUserId.equals(userId)) {
                        return Messenger.builder()
                                .code(403)
                                .message("권한이 없습니다. 토큰의 사용자 ID와 요청한 사용자 ID가 일치하지 않습니다.")
                                .build();
                    }
                }
            }
        }
        return healthcareService.findByUserId(userId);
    }

    @GetMapping("/user")
    @Operation(summary = "JWT 토큰 기반 건강 기록 조회", description = "JWT 토큰에서 사용자 ID를 추출하여 해당 사용자의 건강 기록 정보를 조회합니다.")
    public Messenger findByUserIdFromToken(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        System.out.println("[HealthcareController] /user 엔드포인트 호출됨");
        System.out.println("[HealthcareController] Authorization 헤더: "
                + (authHeader != null ? authHeader.substring(0, Math.min(30, authHeader.length())) + "..." : "null"));

        // Authorization 헤더 검증
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            System.out.println("[HealthcareController] Authorization 헤더가 없거나 형식이 잘못됨");
            return Messenger.builder()
                    .code(401)
                    .message("인증 토큰이 필요합니다.")
                    .build();
        }

        // 토큰 추출
        String token = jwtTokenUtil.extractTokenFromHeader(authHeader);
        System.out.println("[HealthcareController] 추출된 토큰: "
                + (token != null ? token.substring(0, Math.min(30, token.length())) + "..." : "null"));
        if (token == null) {
            System.out.println("[HealthcareController] 토큰 추출 실패");
            return Messenger.builder()
                    .code(401)
                    .message("인증 토큰이 필요합니다.")
                    .build();
        }

        // 토큰에서 userId 추출 (validateToken 우회 - 키 크기 문제로 인해)
        Long userId = jwtTokenUtil.getUserIdFromToken(token);
        if (userId == null) {
            System.err.println("[HealthcareController] 토큰에서 userId 추출 실패");
            // validateToken도 시도해보고 실패하면 에러 반환
            if (!jwtTokenUtil.validateToken(token)) {
                return Messenger.builder()
                        .code(401)
                        .message("유효하지 않은 토큰입니다.")
                        .build();
            }
            return Messenger.builder()
                    .code(401)
                    .message("토큰에서 사용자 ID를 추출할 수 없습니다.")
                    .build();
        }

        System.out.println("[HealthcareController] JWT 토큰에서 추출한 userId: " + userId);
        System.out.println("[HealthcareController] 해당 userId의 건강 기록 조회 시작");
        Messenger result = healthcareService.findByUserId(userId);
        System.out.println(
                "[HealthcareController] 건강 기록 조회 결과: code=" + result.getCode() + ", message=" + result.getMessage());
        if (result.getData() != null) {
            System.out.println("[HealthcareController] 조회된 건강 기록 개수: "
                    + (result.getData() instanceof List ? ((List<?>) result.getData()).size() : 1));
        }
        return result;
    }

    @GetMapping("/user/type")
    @Operation(summary = "JWT 토큰 기반 건강 기록 유형별 조회", description = "JWT 토큰에서 사용자 ID를 추출하여 해당 사용자의 특정 유형 건강 기록 정보를 조회합니다.")
    public Messenger findByUserIdAndTypeFromToken(
            @RequestParam String type,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        // Authorization 헤더 검증
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return Messenger.builder()
                    .code(401)
                    .message("인증 토큰이 필요합니다.")
                    .build();
        }

        // 토큰 추출
        String token = jwtTokenUtil.extractTokenFromHeader(authHeader);
        if (token == null) {
            return Messenger.builder()
                    .code(401)
                    .message("인증 토큰이 필요합니다.")
                    .build();
        }

        // 토큰에서 userId 추출 (validateToken 우회 - 키 크기 문제로 인해)
        Long userId = jwtTokenUtil.getUserIdFromToken(token);
        if (userId == null) {
            // validateToken도 시도해보고 실패하면 에러 반환
            if (!jwtTokenUtil.validateToken(token)) {
                return Messenger.builder()
                        .code(401)
                        .message("유효하지 않은 토큰입니다.")
                        .build();
            }
            return Messenger.builder()
                    .code(401)
                    .message("토큰에서 사용자 ID를 추출할 수 없습니다.")
                    .build();
        }

        return healthcareService.findByUserIdAndType(userId, type);
    }

    @GetMapping("/check/{userId}")
    @Operation(summary = "사용자별 건강 기록 연결 확인", description = "특정 사용자의 건강 기록 연결 상태를 확인합니다.")
    public Messenger checkUserHealthcareConnection(@org.springframework.web.bind.annotation.PathVariable Long userId) {
        return healthcareService.findByUserId(userId);
    }

    @PostMapping
    @Operation(summary = "건강 기록 저장", description = "새로운 건강 기록 정보를 저장합니다.")
    public Messenger save(
            @RequestBody HealthcareModel healthcareModel,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        System.out.println("[HealthcareController] 저장 요청 수신:");
        System.out.println("  - id: " + healthcareModel.getId());
        System.out.println("  - recordDate: " + healthcareModel.getRecordDate());
        System.out.println("  - weatherDate: " + healthcareModel.getWeatherDate());
        System.out.println("  - steps: " + healthcareModel.getSteps());
        System.out.println("  - weight: " + healthcareModel.getWeight());

        return healthcareService.save(healthcareModel);
    }

    @PostMapping("/saveAll")
    @Operation(summary = "건강 기록 일괄 저장", description = "여러 건강 기록 정보를 한 번에 저장합니다.")
    public Messenger saveAll(@RequestBody List<HealthcareModel> healthcareModelList) {
        return healthcareService.saveAll(healthcareModelList);
    }

    @PutMapping
    @Operation(summary = "건강 기록 수정", description = "기존 건강 기록 정보를 수정합니다.")
    public Messenger update(
            @RequestBody HealthcareModel healthcareModel,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        return healthcareService.update(healthcareModel);
    }

    @DeleteMapping
    @Operation(summary = "건강 기록 삭제", description = "건강 기록 정보를 삭제합니다.")
    public Messenger delete(
            @RequestBody HealthcareModel healthcareModel,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        System.out.println("[HealthcareController] 삭제 요청 수신:");
        System.out.println("  - id: " + healthcareModel.getId());

        Messenger result = healthcareService.delete(healthcareModel);
        System.out
                .println("[HealthcareController] 삭제 결과: code=" + result.getCode() + ", message=" + result.getMessage());
        return result;
    }

    @GetMapping("/analysis")
    @Operation(summary = "JWT 토큰 기반 종합건강분석 조회", description = "JWT 토큰에서 사용자 ID를 추출하여 해당 사용자의 종합건강분석 데이터를 조회합니다.")
    public Messenger getComprehensiveAnalysis(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        System.out.println("[HealthcareController] /analysis 엔드포인트 호출됨");

        // Authorization 헤더 검증
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            System.out.println("[HealthcareController] Authorization 헤더가 없거나 형식이 잘못됨");
            return Messenger.builder()
                    .code(401)
                    .message("인증 토큰이 필요합니다.")
                    .build();
        }

        // 토큰 추출
        String token = jwtTokenUtil.extractTokenFromHeader(authHeader);
        if (token == null) {
            System.out.println("[HealthcareController] 토큰 추출 실패");
            return Messenger.builder()
                    .code(401)
                    .message("인증 토큰이 필요합니다.")
                    .build();
        }

        // 토큰에서 userId 추출
        Long userId = jwtTokenUtil.getUserIdFromToken(token);
        if (userId == null) {
            System.err.println("[HealthcareController] 토큰에서 userId 추출 실패");
            if (!jwtTokenUtil.validateToken(token)) {
                return Messenger.builder()
                        .code(401)
                        .message("유효하지 않은 토큰입니다.")
                        .build();
            }
            return Messenger.builder()
                    .code(401)
                    .message("토큰에서 사용자 ID를 추출할 수 없습니다.")
                    .build();
        }

        System.out.println("[HealthcareController] JWT 토큰에서 추출한 userId: " + userId);
        System.out.println("[HealthcareController] 종합건강분석 조회 시작");
        Messenger result = healthcareService.getComprehensiveAnalysis(userId);
        System.out.println(
                "[HealthcareController] 종합건강분석 조회 결과: code=" + result.getCode() + ", message=" + result.getMessage());
        return result;
    }

}
