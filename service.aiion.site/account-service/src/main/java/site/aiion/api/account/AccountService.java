package site.aiion.api.account;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import site.aiion.api.account.common.domain.Messenger;

public interface AccountService {
    public Messenger findById(AccountModel accountModel);
    public Messenger findAll();
    public Messenger findByUserId(Long userId);
    public Messenger findByUserIdAndMonth(Long userId, int year, int month);
    public Messenger findByUserIdAndDate(Long userId, LocalDate date);
    public Messenger save(AccountModel accountModel);
    public Messenger saveAll(List<AccountModel> accountModelList);
    public Messenger update(AccountModel accountModel);
    public Messenger delete(AccountModel accountModel);
    public Messenger updateMemo(Long id, Long userId, String memo);
    public Messenger updateAlarm(Long id, Long userId, Boolean alarmEnabled, LocalDate alarmDate, LocalTime alarmTime);
    public Messenger findActiveAlarms(Long userId);
}

