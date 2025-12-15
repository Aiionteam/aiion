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
@RequestMapping("/health-logs")
@RequiredArgsConstructor
@Tag(name = "04. User Health Logs", description = "건강 기록 관리 기능")
public class UserHealthLogController {

    private final UserHealthLogService userHealthLogService;
    private final JwtTokenUtil jwtTokenUtil;

    @PostMapping("/findById")
    @Operation(summary = "건강 기록 ID로 조회", description = "건강 기록 ID를 받아 해당 건강 기록 정보를 조회합니다.")
    public Messenger findById(@RequestBody UserHealthLogModel userHealthLogModel) {
        return userHealthLogService.findById(userHealthLogModel);
    }

    @GetMapping("/user/{userId}")
    @Operation(summary = "사용자별 건강 기록 조회", description = "특정 사용자의 건강 기록 정보를 조회합니다.")
    public Messenger findByUserId(
            @org.springframework.web.bind.annotation.PathVariable Long userId) {
        return userHealthLogService.findByUserId(userId);
    }

    @GetMapping("/user")
    @Operation(summary = "JWT 토큰 기반 건강 기록 조회", description = "JWT 토큰에서 사용자 ID를 추출하여 건강 기록을 조회합니다.")
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

        return userHealthLogService.findByUserId(userId);
    }

    @PostMapping
    @Operation(summary = "건강 기록 저장", description = "새로운 건강 기록을 저장합니다.")
    public Messenger save(@RequestBody UserHealthLogModel userHealthLogModel) {
        return userHealthLogService.save(userHealthLogModel);
    }

    @PostMapping("/batch")
    @Operation(summary = "건강 기록 일괄 저장", description = "여러 건강 기록을 한 번에 저장합니다.")
    public Messenger saveAll(@RequestBody List<UserHealthLogModel> userHealthLogModelList) {
        return userHealthLogService.saveAll(userHealthLogModelList);
    }

    @PutMapping
    @Operation(summary = "건강 기록 수정", description = "기존 건강 기록을 수정합니다.")
    public Messenger update(@RequestBody UserHealthLogModel userHealthLogModel) {
        return userHealthLogService.update(userHealthLogModel);
    }

    @DeleteMapping
    @Operation(summary = "건강 기록 삭제", description = "건강 기록을 삭제합니다.")
    public Messenger delete(@RequestBody UserHealthLogModel userHealthLogModel) {
        return userHealthLogService.delete(userHealthLogModel);
    }
}

