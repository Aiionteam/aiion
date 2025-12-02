package site.aiion.api.soccer.search;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import site.aiion.api.soccer.common.domain.Messenger;

@RestController
@RequiredArgsConstructor
@RequestMapping("/soccer")
public class SearchController {

    private static final Logger logger = LoggerFactory.getLogger(SearchController.class);

    private final SearchService searchService;

    @GetMapping("/findByWord")
    public Messenger findByWord(
            @RequestParam(required = true) String keyword,
            @RequestParam(required = false) String type) {
        
        // 터미널에 명확하게 출력
        System.out.println("========================================");
        System.out.println("🔍 [프론트엔드 검색 요청 수신]");
        System.out.println("📝 검색어: " + keyword);
        System.out.println("🏷️  검색 타입: " + (type != null && !type.isEmpty() ? type : "전체"));
        System.out.println("========================================");
        
        logger.info("=== [GET] 검색 요청 수신 ===");
        logger.info("검색어: {}", keyword);
        logger.info("검색 타입: {}", type != null ? type : "전체");
        
        Messenger result = searchService.findByWord(keyword, type);
        
        // 검색 결과 출력
        System.out.println("✅ 검색 완료 - 결과 코드: " + result.getCode());
        System.out.println("📊 검색 결과 메시지: " + result.getMessage());
        System.out.println("========================================");
        
        return result;
    }

    @PostMapping("/findByWord")
    public Messenger findByWordPost(
            @RequestParam(required = true) String keyword,
            @RequestParam(required = false) String type) {
        
        // 터미널에 명확하게 출력
        System.out.println("========================================");
        System.out.println("🔍 [프론트엔드 검색 요청 수신 - POST]");
        System.out.println("📝 검색어: " + keyword);
        System.out.println("🏷️  검색 타입: " + (type != null && !type.isEmpty() ? type : "전체"));
        System.out.println("========================================");
        
        logger.info("=== [POST] 검색 요청 수신 ===");
        logger.info("검색어: {}", keyword);
        logger.info("검색 타입: {}", type != null ? type : "전체");
        
        // POST 요청도 GET과 동일하게 처리
        Messenger result = searchService.findByWord(keyword, type);
        
        // 검색 결과 출력
        System.out.println("✅ 검색 완료 - 결과 코드: " + result.getCode());
        System.out.println("📊 검색 결과 메시지: " + result.getMessage());
        System.out.println("========================================");
        
        return result;
    }

}

