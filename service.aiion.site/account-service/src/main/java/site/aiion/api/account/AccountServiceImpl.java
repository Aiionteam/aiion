package site.aiion.api.account;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import site.aiion.api.account.common.domain.Messenger;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class AccountServiceImpl implements AccountService {

    private final AccountRepository accountRepository;

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
                    .Code(400)
                    .message("ID가 필요합니다.")
                    .build();
        }
        if (accountModel.getUserId() == null) {
            return Messenger.builder()
                    .Code(400)
                    .message("사용자 ID가 필요합니다.")
                    .build();
        }
        Optional<Account> entity = accountRepository.findById(accountModel.getId());
        if (entity.isPresent()) {
            Account account = entity.get();
            // userId 검증: 다른 사용자의 가계부는 조회 불가
            if (!account.getUserId().equals(accountModel.getUserId())) {
                return Messenger.builder()
                        .Code(403)
                        .message("다른 사용자의 가계부는 조회할 수 없습니다.")
                        .build();
            }
            AccountModel model = entityToModel(account);
            return Messenger.builder()
                    .Code(200)
                    .message("조회 성공")
                    .data(model)
                    .build();
        } else {
            return Messenger.builder()
                    .Code(404)
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
        return Messenger.builder()
                .Code(200)
                .message("전체 조회 성공: " + modelList.size() + "개")
                .data(modelList)
                .build();
    }

    @Override
    public Messenger findByUserId(Long userId) {
        if (userId == null) {
            return Messenger.builder()
                    .Code(400)
                    .message("사용자 ID가 필요합니다.")
                    .build();
        }
        List<Account> entities = accountRepository.findByUserId(userId);
        List<AccountModel> modelList = entities.stream()
                .map(this::entityToModel)
                .collect(Collectors.toList());
        return Messenger.builder()
                .Code(200)
                .message("사용자별 조회 성공: " + modelList.size() + "개")
                .data(modelList)
                .build();
    }

    @Override
    @Transactional
    public Messenger save(AccountModel accountModel) {
        if (accountModel.getTransactionDate() == null) {
            return Messenger.builder()
                    .Code(400)
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
                .Code(200)
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
                .Code(200)
                .message("일괄 저장 성공: " + saved.size() + "개")
                .build();
    }

    @Override
    @Transactional
    public Messenger update(AccountModel accountModel) {
        if (accountModel.getId() == null) {
            return Messenger.builder()
                    .Code(400)
                    .message("ID가 필요합니다.")
                    .build();
        }
        if (accountModel.getUserId() == null) {
            return Messenger.builder()
                    .Code(400)
                    .message("사용자 ID가 필요합니다.")
                    .build();
        }
        Optional<Account> optionalEntity = accountRepository.findById(accountModel.getId());
        if (optionalEntity.isPresent()) {
            Account existing = optionalEntity.get();
            
            // userId 검증: 다른 사용자의 가계부는 수정 불가
            if (!existing.getUserId().equals(accountModel.getUserId())) {
                return Messenger.builder()
                        .Code(403)
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
                    .Code(200)
                    .message("수정 성공: " + accountModel.getId())
                    .data(model)
                    .build();
        } else {
            return Messenger.builder()
                    .Code(404)
                    .message("수정할 가계부를 찾을 수 없습니다.")
                    .build();
        }
    }

    @Override
    @Transactional
    public Messenger delete(AccountModel accountModel) {
        if (accountModel.getId() == null) {
            return Messenger.builder()
                    .Code(400)
                    .message("ID가 필요합니다.")
                    .build();
        }
        if (accountModel.getUserId() == null) {
            return Messenger.builder()
                    .Code(400)
                    .message("사용자 ID가 필요합니다.")
                    .build();
        }
        Optional<Account> optionalEntity = accountRepository.findById(accountModel.getId());
        if (optionalEntity.isPresent()) {
            Account existing = optionalEntity.get();
            
            // userId 검증: 다른 사용자의 가계부는 삭제 불가
            if (!existing.getUserId().equals(accountModel.getUserId())) {
                return Messenger.builder()
                        .Code(403)
                        .message("다른 사용자의 가계부는 삭제할 수 없습니다.")
                        .build();
            }
            
            accountRepository.deleteById(accountModel.getId());
            return Messenger.builder()
                    .Code(200)
                    .message("삭제 성공: " + accountModel.getId())
                    .build();
        } else {
            return Messenger.builder()
                    .Code(404)
                    .message("삭제할 가계부를 찾을 수 없습니다.")
                    .build();
        }
    }
}

