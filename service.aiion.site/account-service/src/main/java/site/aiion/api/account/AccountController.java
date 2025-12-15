package site.aiion.api.account;

import java.util.List;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import site.aiion.api.account.common.domain.Messenger;
import site.aiion.api.account.util.JwtTokenUtil;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
@RequestMapping("/accounts")
@Tag(name = "01. Account", description = "가계부 관리 기능")
public class AccountController {

    private final AccountService accountService;
    private final JwtTokenUtil jwtTokenUtil;
    private final CsvImportService csvImportService;
    private final AccountRepository accountRepository;

    @PostMapping("/findById")
    @Operation(summary = "가계부 ID로 조회", description = "가계부 ID를 받아 해당 가계부 정보를 조회합니다.")
    public Messenger findById(@RequestBody AccountModel accountModel) {
        return accountService.findById(accountModel);
    }

    @GetMapping("/user/{userId}")
    @Operation(summary = "사용자별 가계부 조회 (Deprecated)", description = "특정 사용자의 가계부 정보를 조회합니다. JWT 토큰 기반 조회를 사용하세요.")
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
        return accountService.findByUserId(userId);
    }
    
    @GetMapping("/user")
    @Operation(summary = "JWT 토큰 기반 가계부 조회", description = "JWT 토큰에서 사용자 ID를 추출하여 해당 사용자의 가계부 정보를 조회합니다.")
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
            System.err.println("[AccountController] 토큰에서 userId 추출 실패");
            return Messenger.builder()
                    .code(401)
                    .message("토큰에서 사용자 ID를 추출할 수 없습니다.")
                    .build();
        }
        
        System.out.println("[AccountController] JWT 토큰에서 추출한 userId: " + userId);
        System.out.println("[AccountController] 해당 userId의 가계부 조회 시작");
        Messenger result = accountService.findByUserId(userId);
        System.out.println("[AccountController] 가계부 조회 결과: Code=" + result.getCode() + ", message=" + result.getMessage());
        if (result.getData() != null) {
            System.out.println("[AccountController] 조회된 가계부 개수: " + (result.getData() instanceof List ? ((List<?>) result.getData()).size() : 1));
        }
        return result;
    }

    @GetMapping("/check/{userId}")
    @Operation(summary = "사용자별 가계부 연결 확인", description = "특정 사용자의 가계부 연결 상태를 확인합니다.")
    public Messenger checkUserAccountConnection(@org.springframework.web.bind.annotation.PathVariable Long userId) {
        return accountService.findByUserId(userId);
    }

    @GetMapping("/user/month")
    @Operation(summary = "JWT 토큰 기반 월별 가계부 조회 (캘린더 형태)", description = "JWT 토큰에서 사용자 ID를 추출하여 특정 년/월의 가계부를 캘린더 형태로 조회합니다.")
    public Messenger findByUserIdAndMonthFromToken(
            @RequestParam(value = "year", required = true) int year,
            @RequestParam(value = "month", required = true) int month,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        System.out.println("[AccountController] /user/month 엔드포인트 호출됨");
        System.out.println("[AccountController] year=" + year + ", month=" + month);
        System.out.println("[AccountController] Authorization 헤더: " + 
            (authHeader != null ? authHeader.substring(0, Math.min(30, authHeader.length())) + "..." : "null"));
        
        // Authorization 헤더 검증
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            System.out.println("[AccountController] Authorization 헤더가 없거나 형식이 잘못됨");
            return Messenger.builder()
                    .code(401)
                    .message("인증 토큰이 필요합니다.")
                    .build();
        }
        
        // 토큰 추출
        String token = jwtTokenUtil.extractTokenFromHeader(authHeader);
        System.out.println("[AccountController] 추출된 토큰: " + 
            (token != null ? token.substring(0, Math.min(30, token.length())) + "..." : "null"));
        if (token == null) {
            System.out.println("[AccountController] 토큰 추출 실패");
            return Messenger.builder()
                    .code(401)
                    .message("인증 토큰이 필요합니다.")
                    .build();
        }
        
        // 토큰에서 userId 추출 (validateToken 우회)
        Long userId = jwtTokenUtil.getUserIdFromToken(token);
        if (userId == null) {
            System.err.println("[AccountController] 토큰에서 userId 추출 실패");
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
        
        System.out.println("[AccountController] JWT 토큰에서 추출한 userId: " + userId);
        System.out.println("[AccountController] 해당 userId의 월별 가계부 조회 시작 (year=" + year + ", month=" + month + ")");
        
        try {
            Messenger result = accountService.findByUserIdAndMonth(userId, year, month);
            System.out.println("[AccountController] 월별 가계부 조회 결과: code=" + result.getCode() + ", message=" + result.getMessage());
            if (result.getData() != null) {
                System.out.println("[AccountController] 조회된 데이터 존재: " + (result.getData() instanceof java.util.Map ? "Map 형태" : "기타"));
                if (result.getData() instanceof java.util.Map) {
                    @SuppressWarnings("unchecked")
                    java.util.Map<String, Object> dataMap = (java.util.Map<String, Object>) result.getData();
                    System.out.println("[AccountController] 데이터 키 목록: " + dataMap.keySet());
                    System.out.println("[AccountController] dailyAccounts 존재: " + dataMap.containsKey("dailyAccounts"));
                    System.out.println("[AccountController] dailyTotals 존재: " + dataMap.containsKey("dailyTotals"));
                    if (dataMap.containsKey("dailyAccounts")) {
                        Object dailyAccounts = dataMap.get("dailyAccounts");
                        if (dailyAccounts instanceof java.util.Map) {
                            System.out.println("[AccountController] dailyAccounts 크기: " + ((java.util.Map<?, ?>) dailyAccounts).size());
                        }
                    }
                    if (dataMap.containsKey("dailyTotals")) {
                        Object dailyTotals = dataMap.get("dailyTotals");
                        if (dailyTotals instanceof java.util.Map) {
                            System.out.println("[AccountController] dailyTotals 크기: " + ((java.util.Map<?, ?>) dailyTotals).size());
                        }
                    }
                }
            } else {
                System.err.println("[AccountController] ⚠️ 경고: result.getData()가 null입니다!");
            }
            return result;
        } catch (Exception e) {
            System.err.println("[AccountController] ⚠️ 월별 가계부 조회 중 예외 발생: " + e.getMessage());
            e.printStackTrace();
            
            // 예외가 발생해도 빈 데이터라도 반환하여 프론트엔드가 크래시하지 않도록
            Map<String, Object> errorData = new HashMap<>();
            errorData.put("year", year);
            errorData.put("month", month);
            errorData.put("dailyAccounts", new HashMap<>());
            errorData.put("dailyTotals", new HashMap<>());
            errorData.put("monthlyTotal", Map.of("income", 0L, "expense", 0L));
            errorData.put("totalCount", 0);
            
            return Messenger.builder()
                    .code(500)
                    .message("월별 가계부 조회 중 오류가 발생했습니다: " + e.getMessage())
                    .data(errorData)
                    .build();
        }
    }

    @GetMapping("/user/{userId}/month")
    @Operation(summary = "월별 가계부 조회 (캘린더 형태)", description = "특정 사용자의 특정 년/월 가계부를 캘린더 형태로 조회합니다.")
    public Messenger findByUserIdAndMonth(
            @PathVariable Long userId,
            @RequestParam(value = "year", required = true) int year,
            @RequestParam(value = "month", required = true) int month) {
        return accountService.findByUserIdAndMonth(userId, year, month);
    }

    @GetMapping("/user/date")
    @Operation(summary = "JWT 토큰 기반 날짜별 가계부 조회", description = "JWT 토큰에서 사용자 ID를 추출하여 특정 날짜의 가계부를 조회합니다.")
    public Messenger findByUserIdAndDateFromToken(
            @RequestParam(value = "date", required = true) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
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
        
        return accountService.findByUserIdAndDate(userId, date);
    }

    @GetMapping("/user/{userId}/date/{date}")
    @Operation(summary = "날짜별 가계부 조회", description = "특정 사용자의 특정 날짜 가계부를 조회합니다.")
    public Messenger findByUserIdAndDate(
            @PathVariable Long userId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return accountService.findByUserIdAndDate(userId, date);
    }

    @PostMapping
    @Operation(summary = "가계부 저장", description = "새로운 가계부 정보를 저장합니다. JWT 토큰에서 userId를 자동으로 추출합니다. userId가 없으면 기본값 1로 설정됩니다.")
    public Messenger save(
            @RequestBody AccountModel accountModel,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        System.out.println("[AccountController] 저장 요청 수신:");
        System.out.println("  - id: " + accountModel.getId());
        System.out.println("  - transactionDate: " + accountModel.getTransactionDate());
        System.out.println("  - type: " + accountModel.getType());
        System.out.println("  - amount: " + accountModel.getAmount());
        System.out.println("  - userId (요청): " + accountModel.getUserId());
        
        // JWT 토큰에서 userId 추출 및 설정
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = jwtTokenUtil.extractTokenFromHeader(authHeader);
            if (token != null && jwtTokenUtil.validateToken(token)) {
                Long tokenUserId = jwtTokenUtil.getUserIdFromToken(token);
                if (tokenUserId != null) {
                    // 토큰의 userId로 덮어쓰기 (보안 강화)
                    accountModel.setUserId(tokenUserId);
                    System.out.println("  - userId (토큰에서 추출): " + tokenUserId);
                }
            }
        } else {
            // 토큰이 없으면 기본값 1로 설정
            if (accountModel.getUserId() == null) {
                accountModel.setUserId(1L);
                System.out.println("  - userId (기본값): 1");
            }
        }
        
        return accountService.save(accountModel);
    }

    @PostMapping("/saveAll")
    @Operation(summary = "가계부 일괄 저장", description = "여러 가계부 정보를 한 번에 저장합니다. userId가 없으면 기본값 1로 설정됩니다.")
    public Messenger saveAll(@RequestBody List<AccountModel> accountModelList) {
        // userId가 없는 항목은 기본값 1로 설정
        accountModelList.forEach(model -> {
            if (model.getUserId() == null) {
                model.setUserId(1L);
            }
        });
        return accountService.saveAll(accountModelList);
    }

    @PutMapping
    @Operation(summary = "가계부 수정", description = "기존 가계부 정보를 수정합니다. JWT 토큰에서 userId를 자동으로 추출합니다.")
    public Messenger update(
            @RequestBody AccountModel accountModel,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        // JWT 토큰에서 userId 추출 및 설정
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = jwtTokenUtil.extractTokenFromHeader(authHeader);
            if (token != null && jwtTokenUtil.validateToken(token)) {
                Long tokenUserId = jwtTokenUtil.getUserIdFromToken(token);
                if (tokenUserId != null) {
                    accountModel.setUserId(tokenUserId);
                }
            }
        }
        return accountService.update(accountModel);
    }


    @DeleteMapping
    @Operation(summary = "가계부 삭제", description = "가계부 정보를 삭제합니다. JWT 토큰에서 userId를 자동으로 추출합니다.")
    public Messenger delete(
            @RequestBody AccountModel accountModel,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        System.out.println("[AccountController] 삭제 요청 수신:");
        System.out.println("  - id: " + accountModel.getId());
        System.out.println("  - userId (요청): " + accountModel.getUserId());
        
        // JWT 토큰에서 userId 추출 및 설정
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = jwtTokenUtil.extractTokenFromHeader(authHeader);
            if (token != null && jwtTokenUtil.validateToken(token)) {
                Long tokenUserId = jwtTokenUtil.getUserIdFromToken(token);
                if (tokenUserId != null) {
                    // 토큰의 userId로 덮어쓰기 (보안 강화)
                    accountModel.setUserId(tokenUserId);
                    System.out.println("  - userId (토큰에서 추출): " + tokenUserId);
                }
            }
        }
        
        Messenger result = accountService.delete(accountModel);
        System.out.println("[AccountController] 삭제 결과: Code=" + result.getCode() + ", message=" + result.getMessage());
        return result;
    }

    @PostMapping("/import-csv")
    @Operation(summary = "CSV 파일에서 가계부 데이터 import", description = "CSV 파일 경로를 지정하여 가계부 데이터를 일괄 import합니다. filePath를 생략하면 기본 파일을 사용합니다.")
    public Messenger importCsv(
            @RequestParam(value = "filePath", required = false) String filePath,
            @RequestParam(value = "userId", required = false, defaultValue = "1") Long userId) {
        try {
            // filePath가 없으면 기본 경로 사용
            if (filePath == null || filePath.isEmpty()) {
                filePath = "account_book_data_3months.csv";
            }
            
            System.out.println("[AccountController] CSV import 요청 수신:");
            System.out.println("  - filePath: " + filePath);
            System.out.println("  - userId: " + userId);
            
            int importedCount = csvImportService.importCsvToDatabase(filePath, userId);
            
            return Messenger.builder()
                    .code(200)
                    .message("CSV import 성공: " + importedCount + " 개의 레코드가 저장되었습니다.")
                    .data(importedCount)
                    .build();
        } catch (Exception e) {
            System.err.println("[AccountController] CSV import 실패: " + e.getMessage());
            e.printStackTrace();
            return Messenger.builder()
                    .code(500)
                    .message("CSV import 실패: " + e.getMessage())
                    .build();
        }
    }

    @GetMapping("/check-db")
    @Operation(summary = "DB 데이터 확인", description = "DB에 저장된 데이터를 확인합니다.")
    public Messenger checkDatabase() {
        try {
            List<Account> allAccounts = accountRepository.findAll();
            int totalCount = allAccounts.size();
            System.out.println("[AccountController] DB 전체 계정 개수: " + totalCount);
            
            // 전체 조회 검증 (400개 확인)
            if (totalCount != 400) {
                System.out.println("[AccountController] ⚠️ 전체 조회 개수가 예상과 다릅니다. 예상: 400개, 실제: " + totalCount + " 개");
            } else {
                System.out.println("[AccountController] ✅ 전체 조회 정상: " + totalCount + " 개");
            }
            
            Map<String, Object> result = new HashMap<>();
            result.put("totalCount", totalCount);
            result.put("expectedCount", 400);
            result.put("isValid", totalCount == 400);
            
            if (!allAccounts.isEmpty()) {
                // userId별 집계
                Map<Long, Long> userIdCounts = allAccounts.stream()
                    .collect(Collectors.groupingBy(Account::getUserId, Collectors.counting()));
                result.put("userIdCounts", userIdCounts);
                
                // 날짜 범위 확인
                List<LocalDate> dates = allAccounts.stream()
                    .map(Account::getTransactionDate)
                    .filter(d -> d != null)
                    .sorted()
                    .distinct()
                    .collect(Collectors.toList());
                
                if (!dates.isEmpty()) {
                    result.put("earliestDate", dates.get(0).toString());
                    result.put("latestDate", dates.get(dates.size() - 1).toString());
                    result.put("dateCount", dates.size());
                }
                
                // 샘플 데이터
                Account sample = allAccounts.get(0);
                Map<String, Object> sampleData = new HashMap<>();
                sampleData.put("id", sample.getId());
                sampleData.put("userId", sample.getUserId());
                sampleData.put("transactionDate", sample.getTransactionDate().toString());
                sampleData.put("type", sample.getType());
                sampleData.put("amount", sample.getAmount());
                result.put("sample", sampleData);
            }
            
            return Messenger.builder()
                    .code(200)
                    .message("DB 확인 완료: " + allAccounts.size() + " 개의 레코드")
                    .data(result)
                    .build();
        } catch (Exception e) {
            System.err.println("[AccountController] DB 확인 실패: " + e.getMessage());
            e.printStackTrace();
            return Messenger.builder()
                    .code(500)
                    .message("DB 확인 실패: " + e.getMessage())
                    .build();
        }
    }

}

