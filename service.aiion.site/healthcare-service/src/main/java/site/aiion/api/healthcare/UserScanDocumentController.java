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
@RequestMapping("/scan-documents")
@RequiredArgsConstructor
@Tag(name = "05. User Scan Documents", description = "스캔된 건강 문서 관리 기능")
public class UserScanDocumentController {

    private final UserScanDocumentService userScanDocumentService;
    private final JwtTokenUtil jwtTokenUtil;

    @PostMapping("/findById")
    @Operation(summary = "스캔 문서 ID로 조회", description = "스캔 문서 ID를 받아 해당 스캔 문서 정보를 조회합니다.")
    public Messenger findById(@RequestBody UserScanDocumentModel userScanDocumentModel) {
        return userScanDocumentService.findById(userScanDocumentModel);
    }

    @GetMapping("/user/{userId}")
    @Operation(summary = "사용자별 스캔 문서 조회", description = "특정 사용자의 스캔 문서 정보를 조회합니다.")
    public Messenger findByUserId(
            @org.springframework.web.bind.annotation.PathVariable Long userId) {
        return userScanDocumentService.findByUserId(userId);
    }

    @GetMapping("/user")
    @Operation(summary = "JWT 토큰 기반 스캔 문서 조회", description = "JWT 토큰에서 사용자 ID를 추출하여 스캔 문서를 조회합니다.")
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

        return userScanDocumentService.findByUserId(userId);
    }

    @PostMapping
    @Operation(summary = "스캔 문서 저장", description = "새로운 스캔 문서를 저장합니다.")
    public Messenger save(@RequestBody UserScanDocumentModel userScanDocumentModel) {
        return userScanDocumentService.save(userScanDocumentModel);
    }

    @PostMapping("/batch")
    @Operation(summary = "스캔 문서 일괄 저장", description = "여러 스캔 문서를 한 번에 저장합니다.")
    public Messenger saveAll(@RequestBody List<UserScanDocumentModel> userScanDocumentModelList) {
        return userScanDocumentService.saveAll(userScanDocumentModelList);
    }

    @PutMapping
    @Operation(summary = "스캔 문서 수정", description = "기존 스캔 문서를 수정합니다.")
    public Messenger update(@RequestBody UserScanDocumentModel userScanDocumentModel) {
        return userScanDocumentService.update(userScanDocumentModel);
    }

    @DeleteMapping
    @Operation(summary = "스캔 문서 삭제", description = "스캔 문서를 삭제합니다.")
    public Messenger delete(@RequestBody UserScanDocumentModel userScanDocumentModel) {
        return userScanDocumentService.delete(userScanDocumentModel);
    }
}

