package site.aiion.api.diary;

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
import site.aiion.api.diary.common.domain.Messenger;
import site.aiion.api.diary.util.JwtTokenUtil;

@RestController
@RequiredArgsConstructor
@RequestMapping("/diaries")
@Tag(name = "01. Diary", description = "일기 관리 기능")
public class DiaryController {

    private final DiaryService diaryService;
    private final JwtTokenUtil jwtTokenUtil;

    @PostMapping("/findById")
    @Operation(summary = "일기 ID로 조회", description = "일기 ID를 받아 해당 일기 정보를 조회합니다.")
    public Messenger findById(@RequestBody DiaryModel diaryModel) {
        return diaryService.findById(diaryModel);
    }

    // 보안: 전체 일기 조회 제거 - 사용자별 조회만 허용
    // @GetMapping
    // @Operation(summary = "전체 일기 조회", description = "모든 일기 정보를 조회합니다.")
    // public Messenger findAll() {
    //     return diaryService.findAll();
    // }

    @GetMapping("/user/{userId}")
    @Operation(summary = "사용자별 일기 조회 (Deprecated)", description = "특정 사용자의 일기 정보를 조회합니다. JWT 토큰 기반 조회를 사용하세요.")
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
        return diaryService.findByUserId(userId);
    }
    
    @GetMapping("/user")
    @Operation(summary = "JWT 토큰 기반 일기 조회", description = "JWT 토큰에서 사용자 ID를 추출하여 해당 사용자의 일기 정보를 조회합니다.")
    public Messenger findByUserIdFromToken(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        // Authorization 헤더 검증
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return Messenger.builder()
                    .code(401)
                    .message("인증 토큰이 필요합니다.")
                    .build();
        }
        
        // 토큰 추출 및 검증
        String token = jwtTokenUtil.extractTokenFromHeader(authHeader);
        if (token == null || !jwtTokenUtil.validateToken(token)) {
            return Messenger.builder()
                    .code(401)
                    .message("유효하지 않은 토큰입니다.")
                    .build();
        }
        
        // 토큰에서 userId 추출
        Long userId = jwtTokenUtil.getUserIdFromToken(token);
        if (userId == null) {
            System.err.println("[DiaryController] 토큰에서 userId 추출 실패");
            return Messenger.builder()
                    .code(401)
                    .message("토큰에서 사용자 ID를 추출할 수 없습니다.")
                    .build();
        }
        
        System.out.println("[DiaryController] JWT 토큰에서 추출한 userId: " + userId);
        System.out.println("[DiaryController] 해당 userId의 일기 조회 시작");
        Messenger result = diaryService.findByUserId(userId);
        System.out.println("[DiaryController] 일기 조회 결과: Code=" + result.getCode() + ", message=" + result.getMessage());
        if (result.getData() != null) {
            System.out.println("[DiaryController] 조회된 일기 개수: " + (result.getData() instanceof List ? ((List<?>) result.getData()).size() : 1));
        }
        return result;
    }

    @GetMapping("/check/{userId}")
    @Operation(summary = "사용자별 일기 연결 확인", description = "특정 사용자의 일기 연결 상태를 확인합니다.")
    public Messenger checkUserDiaryConnection(@org.springframework.web.bind.annotation.PathVariable Long userId) {
        return diaryService.findByUserId(userId);
    }

    @PostMapping
    @Operation(summary = "일기 저장", description = "새로운 일기 정보를 저장합니다. JWT 토큰에서 userId를 자동으로 추출합니다.")
    public Messenger save(
            @RequestBody DiaryModel diaryModel,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        System.out.println("[DiaryController] 저장 요청 수신:");
        System.out.println("  - id: " + diaryModel.getId());
        System.out.println("  - diaryDate: " + diaryModel.getDiaryDate());
        System.out.println("  - title: " + diaryModel.getTitle());
        System.out.println("  - content: " + (diaryModel.getContent() != null ? diaryModel.getContent().length() + "자" : "null"));
        System.out.println("  - userId (요청): " + diaryModel.getUserId());
        
        // JWT 토큰에서 userId 추출 및 설정
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = jwtTokenUtil.extractTokenFromHeader(authHeader);
            if (token != null && jwtTokenUtil.validateToken(token)) {
                Long tokenUserId = jwtTokenUtil.getUserIdFromToken(token);
                if (tokenUserId != null) {
                    // 토큰의 userId로 덮어쓰기 (보안 강화)
                    diaryModel.setUserId(tokenUserId);
                    System.out.println("  - userId (토큰에서 추출): " + tokenUserId);
                }
            }
        }
        
        return diaryService.save(diaryModel);
    }

    @PostMapping("/saveAll")
    @Operation(summary = "일기 일괄 저장", description = "여러 일기 정보를 한 번에 저장합니다.")
    public Messenger saveAll(@RequestBody List<DiaryModel> diaryModelList) {
        return diaryService.saveAll(diaryModelList);
    }

    @PutMapping
    @Operation(summary = "일기 수정", description = "기존 일기 정보를 수정합니다. JWT 토큰에서 userId를 자동으로 추출합니다.")
    public Messenger update(
            @RequestBody DiaryModel diaryModel,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        // JWT 토큰에서 userId 추출 및 설정
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = jwtTokenUtil.extractTokenFromHeader(authHeader);
            if (token != null && jwtTokenUtil.validateToken(token)) {
                Long tokenUserId = jwtTokenUtil.getUserIdFromToken(token);
                if (tokenUserId != null) {
                    diaryModel.setUserId(tokenUserId);
                }
            }
        }
        return diaryService.update(diaryModel);
    }

    @DeleteMapping
    @Operation(summary = "일기 삭제", description = "일기 정보를 삭제합니다. JWT 토큰에서 userId를 자동으로 추출합니다.")
    public Messenger delete(
            @RequestBody DiaryModel diaryModel,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        System.out.println("[DiaryController] 삭제 요청 수신:");
        System.out.println("  - id: " + diaryModel.getId());
        System.out.println("  - userId (요청): " + diaryModel.getUserId());
        
        // JWT 토큰에서 userId 추출 및 설정
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = jwtTokenUtil.extractTokenFromHeader(authHeader);
            if (token != null && jwtTokenUtil.validateToken(token)) {
                Long tokenUserId = jwtTokenUtil.getUserIdFromToken(token);
                if (tokenUserId != null) {
                    // 토큰의 userId로 덮어쓰기 (보안 강화)
                    diaryModel.setUserId(tokenUserId);
                    System.out.println("  - userId (토큰에서 추출): " + tokenUserId);
                }
            }
        }
        
        Messenger result = diaryService.delete(diaryModel);
        System.out.println("[DiaryController] 삭제 결과: Code=" + result.getCode() + ", message=" + result.getMessage());
        return result;
    }

    @PostMapping("/reanalyze-emotions/{userId}")
    @Operation(summary = "기존 일기 감정 분석 재실행 (수동)", description = "모델 재학습 후 기존 일기들을 새 모델로 재분석합니다. 수동 실행용입니다.")
    public Messenger reanalyzeEmotionsForUser(
            @org.springframework.web.bind.annotation.PathVariable Long userId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        // JWT 토큰 검증 (선택사항)
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = jwtTokenUtil.extractTokenFromHeader(authHeader);
            if (token != null && jwtTokenUtil.validateToken(token)) {
                Long tokenUserId = jwtTokenUtil.getUserIdFromToken(token);
                if (tokenUserId != null && !tokenUserId.equals(userId)) {
                    return Messenger.builder()
                            .code(403)
                            .message("권한이 없습니다. 자신의 일기만 재분석할 수 있습니다.")
                            .build();
                }
            }
        }
        
        System.out.println("[DiaryController] 사용자 ID " + userId + "의 기존 일기 감정 분석 재실행 시작");
        Messenger result = diaryService.reanalyzeEmotionsForUser(userId);
        System.out.println("[DiaryController] 감정 분석 재실행 결과: " + result.getMessage());
        return result;
    }

    @PostMapping("/reanalyze-all-emotions")
    @Operation(summary = "모든 일기 감정 분석 (수동)", description = "일기 테이블의 모든 일기를 새 모델로 분석합니다. 수동 실행용입니다.")
    public Messenger reanalyzeAllEmotions(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        System.out.println("[DiaryController] 모든 일기 감정 분석 시작");
        Messenger result = diaryService.reanalyzeAllEmotions();
        System.out.println("[DiaryController] 전체 감정 분석 결과: " + result.getMessage());
        return result;
    }

    @PostMapping("/reanalyze-mbti/{userId}")
    @Operation(summary = "기존 일기 MBTI 분석 재실행 (수동)", description = "모델 재학습 후 기존 일기들을 새 모델로 재분석합니다. 수동 실행용입니다.")
    public Messenger reanalyzeMbtiForUser(
            @org.springframework.web.bind.annotation.PathVariable Long userId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        // JWT 토큰 검증 (선택사항)
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = jwtTokenUtil.extractTokenFromHeader(authHeader);
            if (token != null && jwtTokenUtil.validateToken(token)) {
                Long tokenUserId = jwtTokenUtil.getUserIdFromToken(token);
                if (tokenUserId != null && !tokenUserId.equals(userId)) {
                    return Messenger.builder()
                            .code(403)
                            .message("권한이 없습니다. 자신의 일기만 재분석할 수 있습니다.")
                            .build();
                }
            }
        }
        
        System.out.println("[DiaryController] 사용자 ID " + userId + "의 기존 일기 MBTI 분석 재실행 시작");
        Messenger result = diaryService.reanalyzeMbtiForUser(userId);
        System.out.println("[DiaryController] MBTI 분석 재실행 결과: " + result.getMessage());
        return result;
    }

    @PostMapping("/reanalyze-all-mbti")
    @Operation(summary = "모든 일기 MBTI 분석 (수동)", description = "일기 테이블의 모든 일기를 새 모델로 분석합니다. 수동 실행용입니다.")
    public Messenger reanalyzeAllMbti(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        System.out.println("[DiaryController] 모든 일기 MBTI 분석 시작");
        Messenger result = diaryService.reanalyzeAllMbti();
        System.out.println("[DiaryController] 전체 MBTI 분석 결과: " + result.getMessage());
        return result;
    }

}

