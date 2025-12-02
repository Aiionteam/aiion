package site.aiion.api.diary;

import java.util.List;
import site.aiion.api.diary.common.domain.Messenger;

public interface DiaryService {
    public Messenger findById(DiaryModel diaryModel);
    public Messenger findAll();
    public Messenger findByUserId(Long userId);
    public Messenger save(DiaryModel diaryModel);
    public Messenger saveAll(List<DiaryModel> diaryModelList);
    public Messenger update(DiaryModel diaryModel);
    public Messenger delete(DiaryModel diaryModel);
}

