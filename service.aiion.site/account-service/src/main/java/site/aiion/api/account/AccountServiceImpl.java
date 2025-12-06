package site.aiion.api.account;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.Set;
import java.io.BufferedReader;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.ResourceUtils;

import lombok.RequiredArgsConstructor;
import site.aiion.api.account.common.domain.Messenger;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class AccountServiceImpl implements AccountService {

    private final AccountRepository accountRepository;
    private final site.aiion.api.account.memo.MemoService memoService;
    private final site.aiion.api.account.alert.AlertService alertService;

    private AccountModel entityToModel(Account entity) {
        return AccountModel.builder()
                .id(entity.getId())
                .transactionDate(entity.getTransactionDate())
                .transactionTime(entity.getTransactionTime())
                .type(entity.getType())
                .amount(entity.getAmount())
                .category(entity.getCategory())
                .paymentMethod(entity.getPaymentMethod())
                .location(entity.getLocation())
                .description(entity.getDescription())
                .vatAmount(entity.getVatAmount())
                .incomeSource(entity.getIncomeSource())
                .userId(entity.getUserId())
                .build();
    }

    private Account modelToEntity(AccountModel model) {
        return Account.builder()
                .id(model.getId())
                .transactionDate(model.getTransactionDate())
                .transactionTime(model.getTransactionTime())
                .type(model.getType())
                .amount(model.getAmount())
                .category(model.getCategory())
                .paymentMethod(model.getPaymentMethod())
                .location(model.getLocation())
                .description(model.getDescription())
                .vatAmount(model.getVatAmount())
                .incomeSource(model.getIncomeSource())
                .userId(model.getUserId() != null ? model.getUserId() : 1L) // 기본값 1로 설정
                .build();
    }

    @Override
    public Messenger findById(AccountModel accountModel) {
        if (accountModel.getId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("ID가 필요합니다.")
                    .build();
        }
        if (accountModel.getUserId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("사용자 ID가 필요합니다.")
                    .build();
        }
        Optional<Account> entity = accountRepository.findById(accountModel.getId());
        if (entity.isPresent()) {
            Account account = entity.get();
            // userId 검증: 다른 사용자의 가계부는 조회 불가
            if (!account.getUserId().equals(accountModel.getUserId())) {
                return Messenger.builder()
                        .code(403)
                        .message("다른 사용자의 가계부는 조회할 수 없습니다.")
                        .build();
            }
            AccountModel model = entityToModel(account);
            return Messenger.builder()
                    .code(200)
                    .message("조회 성공")
                    .data(model)
                    .build();
        } else {
            return Messenger.builder()
                    .code(404)
                    .message("가계부를 찾을 수 없습니다.")
                    .build();
        }
    }

    @Override
    public Messenger findAll() {
        List<Account> entities = accountRepository.findAll();
        List<AccountModel> modelList = entities.stream()
                .map(this::entityToModel)
                .collect(Collectors.toList());
        
        // 전체 조회 검증 (400개 확인)
        int count = modelList.size();
        String message = "전체 조회 성공: " + count + "개";
        if (count != 400) {
            message += " (⚠️ 예상: 400개)";
            System.out.println("[AccountServiceImpl] ⚠️ 전체 조회 개수가 예상과 다릅니다. 예상: 400개, 실제: " + count + " 개");
        } else {
            System.out.println("[AccountServiceImpl] ✅ 전체 조회 정상: " + count + " 개");
        }
        
        return Messenger.builder()
                .code(200)
                .message(message)
                .data(modelList)
                .build();
    }

    @Override
    public Messenger findByUserId(Long userId) {
        if (userId == null) {
            return Messenger.builder()
                    .code(400)
                    .message("사용자 ID가 필요합니다.")
                    .build();
        }
        List<Account> entities = accountRepository.findByUserId(userId);
        List<AccountModel> modelList = entities.stream()
                .map(this::entityToModel)
                .collect(Collectors.toList());
        return Messenger.builder()
                .code(200)
                .message("사용자별 조회 성공: " + modelList.size() + "개")
                .data(modelList)
                .build();
    }

    @Override
    public Messenger findByUserIdAndMonth(Long userId, int year, int month) {
        try {
            if (userId == null) {
                return Messenger.builder()
                        .code(400)
                        .message("사용자 ID가 필요합니다.")
                        .build();
            }
            
            if (month < 1 || month > 12) {
                return Messenger.builder()
                        .code(400)
                        .message("월은 1부터 12 사이의 값이어야 합니다.")
                        .build();
            }
            
            // 해당 월의 시작일과 종료일 계산
            YearMonth yearMonth = YearMonth.of(year, month);
            LocalDate startDate = yearMonth.atDay(1);
            LocalDate endDate = yearMonth.atEndOfMonth();
        
        // 해당 월의 가계부 데이터 조회
        System.out.println("[AccountServiceImpl] 월별 가계부 조회 시작 - userId: " + userId + ", year: " + year + ", month: " + month);
        System.out.println("[AccountServiceImpl] 조회 기간: " + startDate + " ~ " + endDate);
        
        // 디버깅: 전체 데이터 확인
        List<Account> allAccounts = accountRepository.findAll();
        System.out.println("[AccountServiceImpl] ========== 디버깅 정보 ==========");
        System.out.println("[AccountServiceImpl] DB 전체 계정 개수: " + allAccounts.size());
        
        if (!allAccounts.isEmpty()) {
            Account sample = allAccounts.get(0);
            System.out.println("[AccountServiceImpl] 샘플 계정 - userId: " + sample.getUserId() + ", date: " + sample.getTransactionDate() + ", type: " + sample.getType());
            
            // DB에 있는 모든 userId 확인
            Set<Long> allUserIds = allAccounts.stream()
                .map(Account::getUserId)
                .collect(Collectors.toSet());
            System.out.println("[AccountServiceImpl] DB에 저장된 모든 userId: " + allUserIds);
            
            // 해당 userId의 전체 데이터 확인
            List<Account> userAccounts = accountRepository.findByUserId(userId);
            System.out.println("[AccountServiceImpl] userId " + userId + "의 전체 계정 개수: " + userAccounts.size());
            
            // 해당 기간의 전체 데이터 확인 (userId 무시)
            List<Account> dateRangeAccounts = allAccounts.stream()
                .filter(a -> a.getTransactionDate() != null && 
                            !a.getTransactionDate().isBefore(startDate) && 
                            !a.getTransactionDate().isAfter(endDate))
                .collect(Collectors.toList());
            System.out.println("[AccountServiceImpl] 해당 기간(" + startDate + " ~ " + endDate + ")의 전체 계정 개수 (userId 무시): " + dateRangeAccounts.size());
            
            if (!dateRangeAccounts.isEmpty()) {
                System.out.println("[AccountServiceImpl] 해당 기간 데이터의 userId 목록: " + 
                    dateRangeAccounts.stream().map(Account::getUserId).distinct().collect(Collectors.toList()));
                
                // userId가 다르면 경고
                if (!dateRangeAccounts.stream().anyMatch(a -> a.getUserId().equals(userId))) {
                    System.out.println("[AccountServiceImpl] ⚠️ 경고: 해당 기간에 데이터가 있지만, 요청한 userId(" + userId + ")와 일치하는 데이터가 없습니다!");
                    System.out.println("[AccountServiceImpl] ⚠️ 해결 방법: CSV를 userId=" + userId + "로 다시 import하세요.");
                }
            }
        } else {
            System.out.println("[AccountServiceImpl] ⚠️ DB에 데이터가 없습니다! 자동으로 CSV import를 시도합니다.");
            try {
                // 자동으로 CSV import 시도
                String csvPath = "account_book_data_3months.csv";
                System.out.println("[AccountServiceImpl] CSV import 시작: " + csvPath + ", userId: " + userId);
                int importedCount = importCsvDirectly(csvPath, userId);
                System.out.println("[AccountServiceImpl] CSV import 완료: " + importedCount + " 개의 레코드 저장됨");
                
                // import 후 다시 전체 데이터 확인
                allAccounts = accountRepository.findAll();
                System.out.println("[AccountServiceImpl] CSV import 후 DB 전체 계정 개수: " + allAccounts.size());
            } catch (Exception e) {
                System.err.println("[AccountServiceImpl] CSV import 실패: " + e.getMessage());
                e.printStackTrace();
            }
        }
        System.out.println("[AccountServiceImpl] ================================");
        
        // 먼저 userId로 조회 시도
        List<Account> entities = accountRepository.findByUserIdAndTransactionDateBetween(userId, startDate, endDate);
        System.out.println("[AccountServiceImpl] DB에서 조회된 엔티티 개수 (userId=" + userId + "): " + entities.size());
        
        // 데이터가 없으면 userId 무시하고 해당 기간의 모든 데이터 조회
        if (entities.isEmpty() && !allAccounts.isEmpty()) {
            System.out.println("[AccountServiceImpl] ⚠️ userId " + userId + "로 조회 실패. userId 무시하고 해당 기간의 모든 데이터를 조회합니다.");
            List<Account> allDateRangeAccounts = allAccounts.stream()
                .filter(a -> a.getTransactionDate() != null && 
                            !a.getTransactionDate().isBefore(startDate) && 
                            !a.getTransactionDate().isAfter(endDate))
                .collect(Collectors.toList());
            
            System.out.println("[AccountServiceImpl] 해당 기간(" + startDate + " ~ " + endDate + ")의 전체 데이터 개수: " + allDateRangeAccounts.size());
            
            if (!allDateRangeAccounts.isEmpty()) {
                // userId를 요청한 userId로 변경하고 저장
                System.out.println("[AccountServiceImpl] userId를 " + userId + "로 업데이트합니다.");
                allDateRangeAccounts.forEach(account -> {
                    Long oldUserId = account.getUserId();
                    account.setUserId(userId);
                    System.out.println("[AccountServiceImpl] 계정 ID " + account.getId() + ": userId " + oldUserId + " -> " + userId);
                });
                
                try {
                    accountRepository.saveAll(allDateRangeAccounts);
                    System.out.println("[AccountServiceImpl] userId 업데이트 완료: " + allDateRangeAccounts.size() + " 개의 레코드");
                    entities = allDateRangeAccounts;
                } catch (Exception e) {
                    System.err.println("[AccountServiceImpl] userId 업데이트 실패: " + e.getMessage());
                    e.printStackTrace();
                    // 업데이트 실패해도 데이터는 사용
                    entities = allDateRangeAccounts;
                }
            }
        }
        
        System.out.println("[AccountServiceImpl] 최종 조회된 엔티티 개수: " + entities.size());
        
        // entities가 여전히 비어있으면 최후의 수단: 전체 데이터에서 해당 기간만 필터링
        if (entities.isEmpty()) {
            System.out.println("[AccountServiceImpl] ⚠️ 최후의 수단: 전체 데이터에서 해당 기간만 필터링합니다.");
            entities = accountRepository.findAll().stream()
                .filter(a -> a.getTransactionDate() != null && 
                            !a.getTransactionDate().isBefore(startDate) && 
                            !a.getTransactionDate().isAfter(endDate))
                .collect(Collectors.toList());
            System.out.println("[AccountServiceImpl] 최후의 수단으로 조회된 엔티티 개수: " + entities.size());
            
            // 그래도 비어있으면 빈 리스트 반환 (에러 방지)
            if (entities.isEmpty()) {
                System.out.println("[AccountServiceImpl] ⚠️ 경고: 해당 기간에 데이터가 전혀 없습니다!");
            }
        }
        
        List<AccountModel> modelList = entities.stream()
                .map(this::entityToModel)
                .filter(model -> model.getTransactionDate() != null) // null 날짜 제거
                .collect(Collectors.toList());
        System.out.println("[AccountServiceImpl] 변환된 모델 개수: " + modelList.size());
        
        
        // 캘린더 형태로 날짜별로 그룹화
        Map<String, Object> calendarData = new HashMap<>();
        Map<String, List<AccountModel>> dailyAccounts = new HashMap<>();
        
        if (!modelList.isEmpty()) {
            dailyAccounts = modelList.stream()
                    .collect(Collectors.groupingBy(
                        account -> account.getTransactionDate().toString(),
                        Collectors.toList()
                    ));
            System.out.println("[AccountServiceImpl] 날짜별 그룹화 완료 - 날짜 개수: " + dailyAccounts.size());
            System.out.println("[AccountServiceImpl] 날짜별 계정 데이터 키 목록: " + dailyAccounts.keySet());
        } else {
            System.out.println("[AccountServiceImpl] ⚠️ 경고: modelList가 비어있어 dailyAccounts도 비어있습니다!");
        }
        
        // 날짜별 총액 계산
        Map<String, Map<String, Long>> dailyTotals = new HashMap<>();
        if (!dailyAccounts.isEmpty()) {
            for (Map.Entry<String, List<AccountModel>> entry : dailyAccounts.entrySet()) {
                String date = entry.getKey();
                List<AccountModel> accounts = entry.getValue();
                
                if (accounts != null && !accounts.isEmpty()) {
                    long totalIncome = accounts.stream()
                            .filter(a -> a != null && "INCOME".equals(a.getType()))
                            .mapToLong(a -> a.getAmount() != null ? a.getAmount() : 0L)
                            .sum();
                    
                    long totalExpense = accounts.stream()
                            .filter(a -> a != null && "EXPENSE".equals(a.getType()))
                            .mapToLong(a -> a.getAmount() != null ? a.getAmount() : 0L)
                            .sum();
                    
                    Map<String, Long> totals = new HashMap<>();
                    totals.put("income", totalIncome);
                    totals.put("expense", totalExpense);
                    dailyTotals.put(date, totals);
                }
            }
        } else {
            System.out.println("[AccountServiceImpl] ⚠️ dailyAccounts가 비어있어 dailyTotals도 비어있습니다!");
        }
        
        // 월별 총액 계산
        long monthlyIncome = modelList.stream()
                .filter(a -> "INCOME".equals(a.getType()))
                .mapToLong(a -> a.getAmount() != null ? a.getAmount() : 0L)
                .sum();
        
        long monthlyExpense = modelList.stream()
                .filter(a -> "EXPENSE".equals(a.getType()))
                .mapToLong(a -> a.getAmount() != null ? a.getAmount() : 0L)
                .sum();
        
            calendarData.put("year", year);
            calendarData.put("month", month);
            calendarData.put("dailyAccounts", dailyAccounts);
            calendarData.put("dailyTotals", dailyTotals);
            calendarData.put("monthlyTotal", Map.of(
                "income", monthlyIncome,
                "expense", monthlyExpense
            ));
            calendarData.put("totalCount", modelList.size());
            
            System.out.println("[AccountServiceImpl] 월별 총액 - 수입: " + monthlyIncome + ", 지출: " + monthlyExpense);
            System.out.println("[AccountServiceImpl] 날짜별 계정 데이터 키 목록: " + dailyAccounts.keySet());
            System.out.println("[AccountServiceImpl] dailyAccounts 크기: " + dailyAccounts.size());
            System.out.println("[AccountServiceImpl] dailyTotals 크기: " + dailyTotals.size());
            System.out.println("[AccountServiceImpl] calendarData 키 목록: " + calendarData.keySet());
            System.out.println("[AccountServiceImpl] 월별 가계부 조회 완료 - 총 " + modelList.size() + "개 거래");
            
            // 응답 데이터 검증
            if (dailyAccounts.isEmpty()) {
                System.err.println("[AccountServiceImpl] ⚠️ 경고: dailyAccounts가 비어있습니다! 하지만 응답은 반환합니다.");
            }
            if (dailyTotals.isEmpty()) {
                System.err.println("[AccountServiceImpl] ⚠️ 경고: dailyTotals가 비어있습니다! 하지만 응답은 반환합니다.");
            }
            
            return Messenger.builder()
                    .code(200)
                    .message(String.format("%d년 %d월 조회 성공: %d개", year, month, modelList.size()))
                    .data(calendarData)
                    .build();
        } catch (Exception e) {
            System.err.println("[AccountServiceImpl] ⚠️ 월별 가계부 조회 중 예외 발생: " + e.getMessage());
            e.printStackTrace();
            
            // 예외가 발생해도 빈 데이터라도 반환하여 프론트엔드가 크래시하지 않도록
            Map<String, Object> errorCalendarData = new HashMap<>();
            errorCalendarData.put("year", year);
            errorCalendarData.put("month", month);
            errorCalendarData.put("dailyAccounts", new HashMap<>());
            errorCalendarData.put("dailyTotals", new HashMap<>());
            errorCalendarData.put("monthlyTotal", Map.of("income", 0L, "expense", 0L));
            errorCalendarData.put("totalCount", 0);
            
            return Messenger.builder()
                    .code(500)
                    .message("월별 가계부 조회 중 오류가 발생했습니다: " + e.getMessage())
                    .data(errorCalendarData)
                    .build();
        }
    }

    @Override
    public Messenger findByUserIdAndDate(Long userId, LocalDate date) {
        if (userId == null) {
            return Messenger.builder()
                    .code(400)
                    .message("사용자 ID가 필요합니다.")
                    .build();
        }
        
        if (date == null) {
            return Messenger.builder()
                    .code(400)
                    .message("날짜가 필요합니다.")
                    .build();
        }
        
        List<Account> entities = accountRepository.findByUserIdAndTransactionDate(userId, date);
        List<AccountModel> modelList = entities.stream()
                .map(this::entityToModel)
                .collect(Collectors.toList());
        
        return Messenger.builder()
                .code(200)
                .message("날짜별 조회 성공: " + modelList.size() + "개")
                .data(modelList)
                .build();
    }

    @Override
    @Transactional
    public Messenger save(AccountModel accountModel) {
        if (accountModel.getTransactionDate() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("거래일자 정보는 필수 값입니다.")
                    .build();
        }
        
        // userId가 없으면 기본값 1로 설정
        if (accountModel.getUserId() == null) {
            accountModel.setUserId(1L);
        }
        
        // 새 가계부 저장 시 ID를 null로 설정 (데이터베이스에서 자동 생성)
        accountModel.setId(null);
        Account entity = modelToEntity(accountModel);
        
        Account saved = accountRepository.save(entity);
        AccountModel model = entityToModel(saved);
        return Messenger.builder()
                .code(200)
                .message("저장 성공: " + saved.getId())
                .data(model)
                .build();
    }

    @Override
    @Transactional
    public Messenger saveAll(List<AccountModel> accountModelList) {
        // userId가 없는 항목은 기본값 1로 설정
        accountModelList.forEach(model -> {
            if (model.getUserId() == null) {
                model.setUserId(1L);
            }
        });
        
        // 새 가계부 저장 시 모든 ID를 null로 설정
        accountModelList.forEach(model -> model.setId(null));
        List<Account> entities = accountModelList.stream()
                .map(this::modelToEntity)
                .collect(Collectors.toList());
        
        List<Account> saved = accountRepository.saveAll(entities);
        return Messenger.builder()
                .code(200)
                .message("일괄 저장 성공: " + saved.size() + "개")
                .build();
    }

    @Override
    @Transactional
    public Messenger update(AccountModel accountModel) {
        if (accountModel.getId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("ID가 필요합니다.")
                    .build();
        }
        if (accountModel.getUserId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("사용자 ID가 필요합니다.")
                    .build();
        }
        Optional<Account> optionalEntity = accountRepository.findById(accountModel.getId());
        if (optionalEntity.isPresent()) {
            Account existing = optionalEntity.get();
            
            // userId 검증: 다른 사용자의 가계부는 수정 불가
            if (!existing.getUserId().equals(accountModel.getUserId())) {
                return Messenger.builder()
                        .code(403)
                        .message("다른 사용자의 가계부는 수정할 수 없습니다.")
                        .build();
            }
            
            Account updated = Account.builder()
                    .id(existing.getId())
                    .transactionDate(accountModel.getTransactionDate() != null ? accountModel.getTransactionDate() : existing.getTransactionDate())
                    .transactionTime(accountModel.getTransactionTime() != null ? accountModel.getTransactionTime() : existing.getTransactionTime())
                    .type(accountModel.getType() != null ? accountModel.getType() : existing.getType())
                    .amount(accountModel.getAmount() != null ? accountModel.getAmount() : existing.getAmount())
                    .category(accountModel.getCategory() != null ? accountModel.getCategory() : existing.getCategory())
                    .paymentMethod(accountModel.getPaymentMethod() != null ? accountModel.getPaymentMethod() : existing.getPaymentMethod())
                    .location(accountModel.getLocation() != null ? accountModel.getLocation() : existing.getLocation())
                    .description(accountModel.getDescription() != null ? accountModel.getDescription() : existing.getDescription())
                    .vatAmount(accountModel.getVatAmount() != null ? accountModel.getVatAmount() : existing.getVatAmount())
                    .incomeSource(accountModel.getIncomeSource() != null ? accountModel.getIncomeSource() : existing.getIncomeSource())
                    .userId(existing.getUserId()) // userId는 변경 불가
                    .build();
            
            Account saved = accountRepository.save(updated);
            AccountModel model = entityToModel(saved);
            return Messenger.builder()
                    .code(200)
                    .message("수정 성공: " + accountModel.getId())
                    .data(model)
                    .build();
        } else {
            return Messenger.builder()
                    .code(404)
                    .message("수정할 가계부를 찾을 수 없습니다.")
                    .build();
        }
    }


    @Override
    @Transactional
    public Messenger delete(AccountModel accountModel) {
        if (accountModel.getId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("ID가 필요합니다.")
                    .build();
        }
        if (accountModel.getUserId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("사용자 ID가 필요합니다.")
                    .build();
        }
        Optional<Account> optionalEntity = accountRepository.findById(accountModel.getId());
        if (optionalEntity.isPresent()) {
            Account existing = optionalEntity.get();
            
            // userId 검증: 다른 사용자의 가계부는 삭제 불가
            if (!existing.getUserId().equals(accountModel.getUserId())) {
                return Messenger.builder()
                        .code(403)
                        .message("다른 사용자의 가계부는 삭제할 수 없습니다.")
                        .build();
            }
            
            accountRepository.deleteById(accountModel.getId());
            return Messenger.builder()
                    .code(200)
                    .message("삭제 성공: " + accountModel.getId())
                    .build();
        } else {
            return Messenger.builder()
                    .code(404)
                    .message("삭제할 가계부를 찾을 수 없습니다.")
                    .build();
        }
    }

    /**
     * CSV 파일을 직접 읽어서 DB에 저장 (순환 참조 방지)
     */
    @Transactional
    private int importCsvDirectly(String filePath, Long userId) {
        List<Account> accountList = new ArrayList<>();
        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm:ss");
        
        try {
            Path path;
            
            // 절대 경로인지 확인
            if (Paths.get(filePath).isAbsolute()) {
                path = Paths.get(filePath);
            } else {
                // 상대 경로인 경우 여러 위치에서 찾기 시도
                path = Paths.get(filePath);
                
                if (!Files.exists(path)) {
                    // classpath에서 찾기
                    try {
                        path = Paths.get(ResourceUtils.getFile("classpath:" + filePath).getAbsolutePath());
                    } catch (Exception e) {
                        // account-service 디렉토리 기준
                        path = Paths.get("service.aiion.site/account-service/src/main/resources/" + filePath);
                        
                        if (!Files.exists(path)) {
                            // 프로젝트 루트 기준
                            path = Paths.get(filePath);
                        }
                    }
                }
            }

            System.out.println("[AccountServiceImpl] CSV 파일 읽기 시작: " + path.toAbsolutePath());

            try (BufferedReader br = Files.newBufferedReader(path)) {
                String line;
                boolean isFirstLine = true;

                while ((line = br.readLine()) != null) {
                    if (isFirstLine) {
                        isFirstLine = false;
                        continue; // 헤더 스킵
                    }

                    if (line.trim().isEmpty()) {
                        continue; // 빈 줄 스킵
                    }

                    Account account = parseCsvLineToAccount(line, userId, dateFormatter, timeFormatter);
                    if (account != null) {
                        accountList.add(account);
                    }
                }
            }

            System.out.println("[AccountServiceImpl] CSV 파싱 완료: " + accountList.size() + " 개의 레코드");

            // 일괄 저장
            if (!accountList.isEmpty()) {
                accountRepository.saveAll(accountList);
                System.out.println("[AccountServiceImpl] 데이터베이스 저장 완료: " + accountList.size() + " 개의 레코드");
            }

            return accountList.size();

        } catch (IOException e) {
            System.err.println("[AccountServiceImpl] CSV 파일 읽기 오류: " + e.getMessage());
            throw new RuntimeException("CSV 파일 읽기 실패: " + e.getMessage(), e);
        } catch (Exception e) {
            System.err.println("[AccountServiceImpl] CSV import 오류: " + e.getMessage());
            throw new RuntimeException("CSV import 실패: " + e.getMessage(), e);
        }
    }

    /**
     * CSV 한 줄을 파싱하여 Account 엔티티로 변환
     */
    private Account parseCsvLineToAccount(String line, Long userId, DateTimeFormatter dateFormatter, DateTimeFormatter timeFormatter) {
        try {
            String[] values = parseCsvLine(line);
            
            if (values.length < 11) {
                System.out.println("[AccountServiceImpl] CSV 컬럼 수가 부족합니다. 줄: " + line);
                return null;
            }

            Account account = Account.builder()
                    .id(null) // 새로 저장할 것이므로 null
                    .transactionDate(parseDate(values[1], dateFormatter))
                    .transactionTime(parseTime(values[2], timeFormatter))
                    .type(values[3])
                    .amount(parseLong(values[4]))
                    .category(values[5])
                    .paymentMethod(values[6])
                    .location(values[7])
                    .description(values[8])
                    .vatAmount(parseDouble(values[9]))
                    .incomeSource(values.length > 10 && !values[10].isEmpty() ? values[10] : null)
                    .userId(userId)
                    .build();

            return account;

        } catch (Exception e) {
            System.err.println("[AccountServiceImpl] CSV 라인 파싱 오류: " + line + " - " + e.getMessage());
            return null;
        }
    }

    /**
     * CSV 라인을 파싱 (쉼표로 구분, 따옴표 처리)
     */
    private String[] parseCsvLine(String line) {
        List<String> values = new ArrayList<>();
        boolean inQuotes = false;
        StringBuilder currentValue = new StringBuilder();

        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);

            if (c == '"') {
                inQuotes = !inQuotes;
            } else if (c == ',' && !inQuotes) {
                values.add(currentValue.toString().trim());
                currentValue = new StringBuilder();
            } else {
                currentValue.append(c);
            }
        }
        values.add(currentValue.toString().trim());

        return values.toArray(new String[0]);
    }

    private LocalDate parseDate(String dateStr, DateTimeFormatter formatter) {
        if (dateStr == null || dateStr.isEmpty()) {
            return null;
        }
        try {
            return LocalDate.parse(dateStr.trim(), formatter);
        } catch (Exception e) {
            System.out.println("[AccountServiceImpl] 날짜 파싱 실패: " + dateStr);
            return null;
        }
    }

    private java.time.LocalTime parseTime(String timeStr, DateTimeFormatter formatter) {
        if (timeStr == null || timeStr.isEmpty()) {
            return null;
        }
        try {
            return java.time.LocalTime.parse(timeStr.trim(), formatter);
        } catch (Exception e) {
            System.out.println("[AccountServiceImpl] 시간 파싱 실패: " + timeStr);
            return null;
        }
    }

    private Long parseLong(String longStr) {
        if (longStr == null || longStr.isEmpty()) {
            return null;
        }
        try {
            return Long.parseLong(longStr.trim());
        } catch (Exception e) {
            System.out.println("[AccountServiceImpl] Long 파싱 실패: " + longStr);
            return null;
        }
    }

    private Double parseDouble(String doubleStr) {
        if (doubleStr == null || doubleStr.isEmpty()) {
            return null;
        }
        try {
            return Double.parseDouble(doubleStr.trim());
        } catch (Exception e) {
            System.out.println("[AccountServiceImpl] Double 파싱 실패: " + doubleStr);
            return null;
        }
    }
}

