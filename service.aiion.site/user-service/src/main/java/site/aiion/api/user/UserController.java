package site.aiion.api.user;

import java.util.List;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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
import site.aiion.api.user.common.domain.Messenger;

@RestController
@RequiredArgsConstructor
@RequestMapping(value = "/users", produces = MediaType.APPLICATION_JSON_VALUE + ";charset=UTF-8")
@Tag(name = "01. User", description = "사용자 관리 기능")
public class UserController {

    private final UserService userService;

    @PostMapping("/findById")
    @Operation(summary = "사용자 ID로 조회", description = "사용자 ID를 받아 해당 사용자 정보를 조회합니다.")
    public Messenger findById(@RequestBody UserModel userModel) {
        return userService.findById(userModel);
    }

    @GetMapping("/findByEmailAndProvider")
    @Operation(summary = "이메일과 제공자로 조회", description = "이메일과 OAuth 제공자로 사용자 정보를 조회합니다.")
    public Messenger findByEmailAndProvider(
            @org.springframework.web.bind.annotation.RequestParam String email,
            @org.springframework.web.bind.annotation.RequestParam String provider) {
        return userService.findByEmailAndProvider(email, provider);
    }

    @GetMapping
    @Operation(summary = "전체 사용자 조회", description = "모든 사용자 정보를 조회합니다.")
    public Messenger findAll() {
        return userService.findAll();
    }

    @PostMapping
    @Operation(summary = "사용자 저장", description = "새로운 사용자 정보를 저장합니다.")
    public Messenger save(@RequestBody UserModel userModel) {
        return userService.save(userModel);
    }

    @PostMapping("/saveAll")
    @Operation(summary = "사용자 일괄 저장", description = "여러 사용자 정보를 한 번에 저장합니다.")
    public Messenger saveAll(@RequestBody List<UserModel> userModelList) {
        return userService.saveAll(userModelList);
    }

    @PutMapping
    @Operation(summary = "사용자 수정", description = "기존 사용자 정보를 수정합니다.")
    public Messenger update(@RequestBody UserModel userModel) {
        return userService.update(userModel);
    }

    @DeleteMapping
    @Operation(summary = "사용자 삭제", description = "사용자 정보를 삭제합니다.")
    public Messenger delete(@RequestBody UserModel userModel) {
        return userService.delete(userModel);
    }

}
