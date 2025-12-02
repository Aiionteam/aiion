package site.aiion.api.soccer.search;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import site.aiion.api.soccer.common.domain.Messenger;
import site.aiion.api.soccer.player.PlayerModel;
import site.aiion.api.soccer.player.PlayerService;
import site.aiion.api.soccer.team.TeamModel;
import site.aiion.api.soccer.team.TeamService;
import site.aiion.api.soccer.schedule.ScheduleModel;
import site.aiion.api.soccer.schedule.ScheduleService;
import site.aiion.api.soccer.stadium.StadiumModel;
import site.aiion.api.soccer.stadium.StadiumService;

@Service
@RequiredArgsConstructor
public class SearchServiceImpl implements SearchService {

    private static final Logger logger = LoggerFactory.getLogger(SearchServiceImpl.class);

    private final PlayerService playerService;
    private final TeamService teamService;
    private final ScheduleService scheduleService;
    private final StadiumService stadiumService;

    @Override
    public Messenger findByWord(String keyword, String type) {
        // 터미널 출력
        System.out.println("🔎 [SearchService] 검색 서비스 실행");
        System.out.println("   └─ 검색어: " + keyword);
        System.out.println("   └─ 검색 타입: " + (type != null && !type.isEmpty() ? type : "전체"));
        
        logger.info("=== 검색 서비스 실행 ===");
        logger.info("검색어: {}", keyword);
        logger.info("검색 타입: {}", type != null ? type : "전체");
        
        try {
            Map<String, Object> result = new HashMap<>();
            List<Object> allResults = new ArrayList<>();
            
            // 타입이 지정되지 않았거나 "player"인 경우
            if (type == null || type.isEmpty() || "player".equalsIgnoreCase(type)) {
                logger.info("선수 검색 시작...");
                PlayerModel playerModel = PlayerModel.builder()
                    .player_name(keyword)
                    .build();
                Messenger playerResult = playerService.findByWord(playerModel);
                if (playerResult != null && playerResult.getData() != null) {
                    result.put("players", playerResult.getData());
                    if (playerResult.getData() instanceof List) {
                        allResults.addAll((List<?>) playerResult.getData());
                    }
                }
                logger.info("선수 검색 완료");
            }
            
            // 타입이 지정되지 않았거나 "team"인 경우
            if (type == null || type.isEmpty() || "team".equalsIgnoreCase(type)) {
                logger.info("팀 검색 시작...");
                TeamModel teamModel = TeamModel.builder()
                    .team_name(keyword)
                    .build();
                Messenger teamResult = teamService.findByWord(teamModel);
                if (teamResult != null && teamResult.getData() != null) {
                    result.put("teams", teamResult.getData());
                    if (teamResult.getData() instanceof List) {
                        allResults.addAll((List<?>) teamResult.getData());
                    }
                }
                logger.info("팀 검색 완료");
            }
            
            // 타입이 지정되지 않았거나 "stadium"인 경우
            if (type == null || type.isEmpty() || "stadium".equalsIgnoreCase(type)) {
                logger.info("경기장 검색 시작...");
                StadiumModel stadiumModel = StadiumModel.builder()
                    .stadium_name(keyword)
                    .build();
                Messenger stadiumResult = stadiumService.findByWord(stadiumModel);
                if (stadiumResult != null && stadiumResult.getData() != null) {
                    result.put("stadiums", stadiumResult.getData());
                    if (stadiumResult.getData() instanceof List) {
                        allResults.addAll((List<?>) stadiumResult.getData());
                    }
                }
                logger.info("경기장 검색 완료");
            }
            
            // 타입이 지정되지 않았거나 "schedule"인 경우
            if (type == null || type.isEmpty() || "schedule".equalsIgnoreCase(type)) {
                logger.info("일정 검색 시작...");
                ScheduleModel scheduleModel = ScheduleModel.builder()
                    .build();
                Messenger scheduleResult = scheduleService.findByWord(scheduleModel);
                if (scheduleResult != null && scheduleResult.getData() != null) {
                    result.put("schedules", scheduleResult.getData());
                    if (scheduleResult.getData() instanceof List) {
                        allResults.addAll((List<?>) scheduleResult.getData());
                    }
                }
                logger.info("일정 검색 완료");
            }
            
            // 결과가 없으면 빈 맵 반환
            if (result.isEmpty()) {
                logger.warn("검색 결과가 없습니다. 검색어: {}, 타입: {}", keyword, type);
                String typeDisplay = type != null && !type.isEmpty() ? type : "전체";
                String message = String.format("⚠️ 검색어 '%s' (타입: %s)에 대한 결과를 찾을 수 없습니다.", 
                    keyword, typeDisplay);
                return Messenger.builder()
                    .Code(404)
                    .message(message)
                    .data(null)
                    .build();
            }
            
            // 최종 결과 구성
            Map<String, Object> finalData = new HashMap<>();
            finalData.put("results", result);
            finalData.put("totalCount", allResults.size());
            
            // 응답 메시지에 검색어와 타입 포함
            String typeDisplay = type != null && !type.isEmpty() ? type : "전체";
            String message = String.format("✅ 검색어 '%s' (타입: %s)에 대한 검색이 완료되었습니다. 결과: %d개", 
                keyword, typeDisplay, allResults.size());
            
            // 터미널에 결과 출력
            System.out.println("📈 [SearchService] 검색 결과:");
            System.out.println("   └─ 총 결과 수: " + allResults.size() + "개");
            System.out.println("   └─ 결과 타입별 분류:");
            result.forEach((key, value) -> {
                if (value instanceof List) {
                    System.out.println("      • " + key + ": " + ((List<?>) value).size() + "개");
                } else {
                    System.out.println("      • " + key + ": 1개");
                }
            });
            
            logger.info("응답 메시지: {}", message);
            
            return Messenger.builder()
                .Code(200)
                .message(message)
                .data(finalData)
                .build();
                
        } catch (Exception e) {
            logger.error("검색 중 오류 발생 - 검색어: {}, 타입: {}", keyword, type, e);
            String errorMessage = String.format("❌ 검색어 '%s' (타입: %s) 검색 중 오류가 발생했습니다: %s", 
                keyword, type != null ? type : "전체", e.getMessage());
            return Messenger.builder()
                .Code(500)
                .message(errorMessage)
                .data(null)
                .build();
        }
    }
}

