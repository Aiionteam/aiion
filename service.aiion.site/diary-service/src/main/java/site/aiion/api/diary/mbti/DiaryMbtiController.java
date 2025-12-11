package site.aiion.api.diary.mbti;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
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
@RequestMapping("/diary-mbti")
@Tag(name = "04. Diary MBTI", description = "일기 MBTI 분석 기능")
public class DiaryMbtiController {

    private final DiaryMbtiService diaryMbtiService;
    private final JwtTokenUtil jwtTokenUtil;

    @GetMapping("/diary/{diaryId}")
    @Operation(summary = "일기 ID로 MBTI 분석 결과 조회", description = "일기 ID를 받아 해당 일기의 MBTI 분석 결과를 조회합니다.")
    public Messenger findByDiaryId(
            @PathVariable Long diaryId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        // JWT 토큰 검증 (선택사항)
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = jwtTokenUtil.extractTokenFromHeader(authHeader);
            if (token != null && !jwtTokenUtil.validateToken(token)) {
                return Messenger.builder()
                        .code(401)
                        .message("유효하지 않은 토큰입니다.")
                        .build();
            }
        }
        
        return diaryMbtiService.findByDiaryId(diaryId);
    }

    @PostMapping("/analyze/{diaryId}")
    @Operation(summary = "일기 MBTI 분석 수행", description = "일기 ID, 제목, 내용을 받아 MBTI 분석을 수행하고 결과를 저장합니다.")
    public Messenger analyzeAndSave(
            @PathVariable Long diaryId,
            @RequestBody AnalyzeRequest request,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        // JWT 토큰 검증 (선택사항)
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = jwtTokenUtil.extractTokenFromHeader(authHeader);
            if (token != null && !jwtTokenUtil.validateToken(token)) {
                return Messenger.builder()
                        .code(401)
                        .message("유효하지 않은 토큰입니다.")
                        .build();
            }
        }
        
        return diaryMbtiService.analyzeAndSave(
            diaryId, 
            request.getTitle(), 
            request.getContent()
        );
    }

    @DeleteMapping("/diary/{diaryId}")
    @Operation(summary = "일기 MBTI 분석 결과 삭제", description = "일기 ID를 받아 해당 일기의 MBTI 분석 결과를 삭제합니다.")
    public Messenger deleteByDiaryId(
            @PathVariable Long diaryId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        // JWT 토큰 검증 (선택사항)
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = jwtTokenUtil.extractTokenFromHeader(authHeader);
            if (token != null && !jwtTokenUtil.validateToken(token)) {
                return Messenger.builder()
                        .code(401)
                        .message("유효하지 않은 토큰입니다.")
                        .build();
            }
        }
        
        return diaryMbtiService.deleteByDiaryId(diaryId);
    }

    // 내부 클래스: 분석 요청 DTO
    @lombok.Data
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class AnalyzeRequest {
        private String title;
        private String content;
    }
}

