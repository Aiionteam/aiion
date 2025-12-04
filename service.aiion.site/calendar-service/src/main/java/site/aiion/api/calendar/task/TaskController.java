package site.aiion.api.calendar.task;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import site.aiion.api.calendar.util.JwtTokenUtil;
import site.aiion.api.domain.Messenger;

@RestController
@RequiredArgsConstructor
@RequestMapping("/tasks")
@Tag(name = "03. Task", description = "할 일 관리 기능")
public class TaskController {

    private final TaskService taskService;
    private final JwtTokenUtil jwtTokenUtil;

    @PostMapping("/findById")
    @Operation(summary = "할 일 ID로 조회", description = "할 일 ID를 받아 해당 할 일 정보를 조회합니다.")
    public Messenger findById(@RequestBody TaskModel taskModel) {
        return taskService.findById(taskModel);
    }

    @GetMapping("/user/{userId}")
    @Operation(summary = "사용자 할 일 목록 조회 (Deprecated)", description = "사용자 ID로 모든 할 일을 조회합니다. JWT 토큰 기반 조회를 사용하세요.")
    public Messenger findByUserId(
            @PathVariable Long userId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        // JWT 토큰이 있으면 토큰에서 userId 추출 (보안 강화)
        if (authHeader != null) {
            String token = jwtTokenUtil.extractTokenFromHeader(authHeader);
            if (token != null && jwtTokenUtil.validateToken(token)) {
                Long tokenUserId = jwtTokenUtil.getUserIdFromToken(token);
                if (tokenUserId != null && !tokenUserId.equals(userId)) {
                    return Messenger.builder()
                                .code(403)
                            .message("권한이 없습니다. 토큰의 사용자 ID와 요청한 사용자 ID가 일치하지 않습니다.")
                            .build();
                }
            }
        }
        return taskService.findByUserId(userId);
    }
    
    @GetMapping("/user")
    @Operation(summary = "JWT 토큰 기반 할 일 목록 조회", description = "JWT 토큰에서 사용자 ID를 추출하여 해당 사용자의 할 일 목록을 조회합니다.")
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
            return Messenger.builder()
                    .code(401)
                    .message("토큰에서 사용자 ID를 추출할 수 없습니다.")
                    .build();
        }
        
        System.out.println("[TaskController] JWT 토큰에서 추출한 userId: " + userId);
        return taskService.findByUserId(userId);
    }

    @GetMapping("/user/{userId}/date/{date}")
    @Operation(summary = "날짜별 할 일 조회", description = "사용자 ID와 날짜로 해당 날짜의 할 일을 조회합니다.")
    public Messenger findByUserIdAndDate(
            @PathVariable Long userId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return taskService.findByUserIdAndDate(userId, date);
    }

    @GetMapping("/user/{userId}/completed/{completed}")
    @Operation(summary = "완료 상태별 할 일 조회", description = "사용자 ID와 완료 상태로 할 일을 조회합니다.")
    public Messenger findByUserIdAndCompleted(
            @PathVariable Long userId,
            @PathVariable Boolean completed) {
        return taskService.findByUserIdAndCompleted(userId, completed);
    }

    @PostMapping
    @Operation(summary = "할 일 저장", description = "새로운 할 일 정보를 저장합니다. JWT 토큰에서 userId를 자동으로 추출합니다.")
    public Messenger save(
            @RequestBody TaskModel taskModel,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        System.out.println("[TaskController] 저장 요청 수신:");
        System.out.println("  - id: " + taskModel.getId());
        System.out.println("  - text: " + taskModel.getText());
        System.out.println("  - date: " + taskModel.getDate());
        System.out.println("  - userId (요청): " + taskModel.getUserId());
        
        // JWT 토큰에서 userId 추출 및 설정
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = jwtTokenUtil.extractTokenFromHeader(authHeader);
            if (token != null && jwtTokenUtil.validateToken(token)) {
                Long tokenUserId = jwtTokenUtil.getUserIdFromToken(token);
                if (tokenUserId != null) {
                    // 토큰의 userId로 덮어쓰기 (보안 강화)
                    taskModel.setUserId(tokenUserId);
                    System.out.println("  - userId (토큰에서 추출): " + tokenUserId);
                }
            }
        }
        
        Messenger result = taskService.save(taskModel);
        System.out.println("[TaskController] 저장 결과: Code=" + result.getCode() + ", message=" + result.getMessage());
        return result;
    }

    @PostMapping("/saveAll")
    @Operation(summary = "할 일 일괄 저장", description = "여러 할 일 정보를 한 번에 저장합니다.")
    public Messenger saveAll(@RequestBody List<TaskModel> taskModelList) {
        return taskService.saveAll(taskModelList);
    }

    @PutMapping
    @Operation(summary = "할 일 수정", description = "기존 할 일 정보를 수정합니다. JWT 토큰에서 userId를 자동으로 추출합니다.")
    public Messenger update(
            @RequestBody TaskModel taskModel,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        // JWT 토큰에서 userId 추출 및 설정
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = jwtTokenUtil.extractTokenFromHeader(authHeader);
            if (token != null && jwtTokenUtil.validateToken(token)) {
                Long tokenUserId = jwtTokenUtil.getUserIdFromToken(token);
                if (tokenUserId != null) {
                    taskModel.setUserId(tokenUserId);
                }
            }
        }
        return taskService.update(taskModel);
    }

    @PutMapping("/toggle/{taskId}/user/{userId}")
    @Operation(summary = "할 일 완료 상태 토글 (Deprecated)", description = "할 일의 완료 상태를 토글합니다. JWT 토큰 기반 토글을 사용하세요.")
    public Messenger toggleCompleted(
            @PathVariable Long taskId,
            @PathVariable Long userId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        // JWT 토큰이 있으면 토큰에서 userId 추출 (보안 강화)
        if (authHeader != null) {
            String token = jwtTokenUtil.extractTokenFromHeader(authHeader);
            if (token != null && jwtTokenUtil.validateToken(token)) {
                Long tokenUserId = jwtTokenUtil.getUserIdFromToken(token);
                if (tokenUserId != null && !tokenUserId.equals(userId)) {
                    return Messenger.builder()
                                .code(403)
                            .message("권한이 없습니다. 토큰의 사용자 ID와 요청한 사용자 ID가 일치하지 않습니다.")
                            .build();
                }
            }
        }
        return taskService.toggleCompleted(taskId, userId);
    }
    
    @PutMapping("/toggle/{taskId}")
    @Operation(summary = "JWT 토큰 기반 할 일 완료 상태 토글", description = "JWT 토큰에서 사용자 ID를 추출하여 할 일의 완료 상태를 토글합니다.")
    public Messenger toggleCompletedFromToken(
            @PathVariable Long taskId,
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
            return Messenger.builder()
                    .code(401)
                    .message("토큰에서 사용자 ID를 추출할 수 없습니다.")
                    .build();
        }
        
        System.out.println("[TaskController] JWT 토큰에서 추출한 userId: " + userId);
        return taskService.toggleCompleted(taskId, userId);
    }

    @DeleteMapping
    @Operation(summary = "할 일 삭제", description = "할 일 정보를 삭제합니다. JWT 토큰에서 userId를 자동으로 추출합니다.")
    public Messenger delete(
            @RequestBody TaskModel taskModel,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        System.out.println("[TaskController] 삭제 요청 수신:");
        System.out.println("  - id: " + taskModel.getId());
        System.out.println("  - userId (요청): " + taskModel.getUserId());
        
        // JWT 토큰에서 userId 추출 및 설정
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = jwtTokenUtil.extractTokenFromHeader(authHeader);
            if (token != null && jwtTokenUtil.validateToken(token)) {
                Long tokenUserId = jwtTokenUtil.getUserIdFromToken(token);
                if (tokenUserId != null) {
                    // 토큰의 userId로 덮어쓰기 (보안 강화)
                    taskModel.setUserId(tokenUserId);
                    System.out.println("  - userId (토큰에서 추출): " + tokenUserId);
                }
            }
        }
        
        Messenger result = taskService.delete(taskModel);
        System.out.println("[TaskController] 삭제 결과: Code=" + result.getCode() + ", message=" + result.getMessage());
        return result;
    }
}

