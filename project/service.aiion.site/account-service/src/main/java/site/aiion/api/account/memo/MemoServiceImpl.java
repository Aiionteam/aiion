package site.aiion.api.account.memo;

import java.time.LocalDateTime;
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
public class MemoServiceImpl implements MemoService {

    private final MemoRepository memoRepository;

    private MemoModel entityToModel(Memo entity) {
        return MemoModel.builder()
                .id(entity.getId())
                .accountId(entity.getAccountId())
                .userId(entity.getUserId())
                .content(entity.getContent())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private Memo modelToEntity(MemoModel model) {
        LocalDateTime now = LocalDateTime.now();
        return Memo.builder()
                .id(model.getId())
                .accountId(model.getAccountId())
                .userId(model.getUserId())
                .content(model.getContent())
                .createdAt(model.getCreatedAt() != null ? model.getCreatedAt() : now)
                .updatedAt(model.getUpdatedAt() != null ? model.getUpdatedAt() : now)
                .build();
    }

    @Override
    public Messenger findById(MemoModel memoModel) {
        if (memoModel.getId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("ID가 필요합니다.")
                    .build();
        }
        if (memoModel.getUserId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("사용자 ID가 필요합니다.")
                    .build();
        }
        Optional<Memo> entity = memoRepository.findById(memoModel.getId());
        if (entity.isPresent()) {
            Memo memo = entity.get();
            // userId 검증: 다른 사용자의 메모는 조회 불가
            if (!memo.getUserId().equals(memoModel.getUserId())) {
                return Messenger.builder()
                        .code(403)
                        .message("다른 사용자의 메모는 조회할 수 없습니다.")
                        .build();
            }
            MemoModel model = entityToModel(memo);
            return Messenger.builder()
                    .code(200)
                    .message("메모 조회 성공")
                    .data(model)
                    .build();
        } else {
            return Messenger.builder()
                    .code(404)
                    .message("메모를 찾을 수 없습니다.")
                    .build();
        }
    }

    @Override
    public Messenger findByAccountId(Long accountId, Long userId) {
        if (accountId == null || userId == null) {
            return Messenger.builder()
                    .code(400)
                    .message("계정 ID와 사용자 ID가 필요합니다.")
                    .build();
        }
        Optional<Memo> entity = memoRepository.findByAccountIdAndUserId(accountId, userId);
        if (entity.isPresent()) {
            MemoModel model = entityToModel(entity.get());
            return Messenger.builder()
                    .code(200)
                    .message("메모 조회 성공")
                    .data(model)
                    .build();
        } else {
            return Messenger.builder()
                    .code(404)
                    .message("메모를 찾을 수 없습니다.")
                    .build();
        }
    }

    @Override
    public java.util.Map<Long, MemoModel> findByAccountIds(java.util.List<Long> accountIds, Long userId) {
        if (accountIds == null || accountIds.isEmpty() || userId == null) {
            return new java.util.HashMap<>();
        }
        List<Memo> entities = memoRepository.findByAccountIdInAndUserId(accountIds, userId);
        return entities.stream()
                .collect(java.util.stream.Collectors.toMap(
                    Memo::getAccountId,
                    this::entityToModel,
                    (existing, replacement) -> existing
                ));
    }

    @Override
    public Messenger findByUserId(Long userId) {
        if (userId == null) {
            return Messenger.builder()
                    .code(400)
                    .message("사용자 ID가 필요합니다.")
                    .build();
        }
        List<Memo> entities = memoRepository.findByUserIdOrderByCreatedAtDesc(userId);
        List<MemoModel> modelList = entities.stream()
                .map(this::entityToModel)
                .collect(Collectors.toList());
        return Messenger.builder()
                .code(200)
                .message("메모 조회 성공: " + modelList.size() + "개")
                .data(modelList)
                .build();
    }

    @Override
    @Transactional
    public Messenger save(MemoModel memoModel) {
        try {
            if (memoModel.getAccountId() == null) {
                return Messenger.builder()
                        .code(400)
                        .message("계정 ID는 필수 값입니다.")
                        .build();
            }
            if (memoModel.getUserId() == null) {
                return Messenger.builder()
                        .code(400)
                        .message("사용자 ID는 필수 값입니다.")
                        .build();
            }
            
            // 같은 accountId에 대한 메모가 이미 있는지 확인
            Optional<Memo> existing = memoRepository.findByAccountIdAndUserId(
                    memoModel.getAccountId(), 
                    memoModel.getUserId()
            );
            
            if (existing.isPresent()) {
                // 기존 메모가 있으면 업데이트
                Memo memo = existing.get();
                memo.setContent(memoModel.getContent());
                memo.setUpdatedAt(LocalDateTime.now());
                Memo saved = memoRepository.save(memo);
                MemoModel model = entityToModel(saved);
                return Messenger.builder()
                        .code(200)
                        .message("메모 수정 성공")
                        .data(model)
                        .build();
            } else {
                // 새로 생성
                if (memoModel.getId() != null) {
                    memoModel.setId(null);
                }
                Memo entity = modelToEntity(memoModel);
                Memo saved = memoRepository.save(entity);
                MemoModel model = entityToModel(saved);
                return Messenger.builder()
                        .code(200)
                        .message("메모 저장 성공")
                        .data(model)
                        .build();
            }
        } catch (Exception e) {
            e.printStackTrace();
            return Messenger.builder()
                    .code(500)
                    .message("메모 저장 중 오류가 발생했습니다: " + e.getMessage())
                    .build();
        }
    }

    @Override
    @Transactional
    public Messenger update(MemoModel memoModel) {
        if (memoModel.getId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("ID가 필요합니다.")
                    .build();
        }
        if (memoModel.getUserId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("사용자 ID가 필요합니다.")
                    .build();
        }
        Optional<Memo> optionalEntity = memoRepository.findById(memoModel.getId());
        if (optionalEntity.isPresent()) {
            Memo existing = optionalEntity.get();
            
            // userId 검증: 다른 사용자의 메모는 수정 불가
            if (!existing.getUserId().equals(memoModel.getUserId())) {
                return Messenger.builder()
                        .code(403)
                        .message("다른 사용자의 메모는 수정할 수 없습니다.")
                        .build();
            }
            
            Memo updated = Memo.builder()
                    .id(existing.getId())
                    .accountId(existing.getAccountId())
                    .userId(existing.getUserId())
                    .content(memoModel.getContent() != null ? memoModel.getContent() : existing.getContent())
                    .createdAt(existing.getCreatedAt())
                    .updatedAt(LocalDateTime.now())
                    .build();
            
            Memo saved = memoRepository.save(updated);
            MemoModel model = entityToModel(saved);
            return Messenger.builder()
                    .code(200)
                    .message("메모 수정 성공")
                    .data(model)
                    .build();
        } else {
            return Messenger.builder()
                    .code(404)
                    .message("수정할 메모를 찾을 수 없습니다.")
                    .build();
        }
    }

    @Override
    @Transactional
    public Messenger delete(MemoModel memoModel) {
        if (memoModel.getId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("ID가 필요합니다.")
                    .build();
        }
        if (memoModel.getUserId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("사용자 ID가 필요합니다.")
                    .build();
        }
        Optional<Memo> optionalEntity = memoRepository.findById(memoModel.getId());
        if (optionalEntity.isPresent()) {
            Memo existing = optionalEntity.get();
            
            // userId 검증: 다른 사용자의 메모는 삭제 불가
            if (!existing.getUserId().equals(memoModel.getUserId())) {
                return Messenger.builder()
                        .code(403)
                        .message("다른 사용자의 메모는 삭제할 수 없습니다.")
                        .build();
            }
            
            memoRepository.deleteById(memoModel.getId());
            return Messenger.builder()
                    .code(200)
                    .message("메모 삭제 성공")
                    .build();
        } else {
            return Messenger.builder()
                    .code(404)
                    .message("삭제할 메모를 찾을 수 없습니다.")
                    .build();
        }
    }
}

