package site.aiion.api.common.controller;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.view.RedirectView;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import site.aiion.api.common.domain.Messenger;

@RestController
@Tag(name = "Home", description = "홈 컨트롤러 API")
public class HomeController {
    
    @GetMapping(value = "/", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
        summary = "홈 페이지", 
        description = "홈 페이지를 반환합니다. 응답으로 Messenger 객체를 반환합니다.",
        tags = { "Home" }
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200", 
            description = "성공적으로 홈 페이지를 반환했습니다.",
            content = @Content(
                mediaType = MediaType.APPLICATION_JSON_VALUE,
                schema = @Schema(implementation = Messenger.class)
            )
        )
    })
    public Messenger home() {
    
        return Messenger.builder()
                .Code(200)
                .message("어서옵쇼")
                .build();
    }
    
    @GetMapping("/docs")
    @Operation(
        summary = "Swagger UI", 
        description = "Swagger UI로 리다이렉트합니다.",
        tags = { "Home" }
    )
    public RedirectView docs() {
        return new RedirectView("/swagger-ui.html");
    }
}

