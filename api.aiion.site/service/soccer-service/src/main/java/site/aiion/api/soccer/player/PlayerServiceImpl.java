package site.aiion.api.soccer.player;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import site.aiion.api.soccer.common.domain.Messenger;
import site.aiion.api.soccer.team.TeamRepository;
import site.aiion.api.soccer.team.Team;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class PlayerServiceImpl implements PlayerService {

    private final PlayerRepository playerRepository;
    private final TeamRepository teamRepository;

    private PlayerModel entityToModel(Player entity) {
        return PlayerModel.builder()
                .id(entity.getId())
                .player_uk(entity.getPlayer_uk())
                .player_name(entity.getPlayer_name())
                .e_player_name(entity.getE_player_name())
                .nickname(entity.getNickname())
                .join_yyyy(entity.getJoin_yyyy())
                .position(entity.getPosition())
                .back_no(entity.getBack_no())
                .nation(entity.getNation())
                .birth_date(entity.getBirth_date())
                .solar(entity.getSolar())
                .height(entity.getHeight())
                .weight(entity.getWeight())
                .team_uk(entity.getTeam_uk())
                .build();
    }

    private Player modelToEntity(PlayerModel model) {
        Team team = null;
        if (model.getTeam_uk() != null) {
            team = teamRepository.findByTeam_uk(model.getTeam_uk()).orElse(null);
        }
        return Player.builder()
                .id(model.getId())
                .player_uk(model.getPlayer_uk())
                .player_name(model.getPlayer_name())
                .e_player_name(model.getE_player_name())
                .nickname(model.getNickname())
                .join_yyyy(model.getJoin_yyyy())
                .position(model.getPosition())
                .back_no(model.getBack_no())
                .nation(model.getNation())
                .birth_date(model.getBirth_date())
                .solar(model.getSolar())
                .height(model.getHeight())
                .weight(model.getWeight())
                .team_uk(model.getTeam_uk())
                .team(team)
                .build();
    }

    @Override
    public Messenger findById(PlayerModel playerModel) {
        if (playerModel.getId() == null) {
            return Messenger.builder()
                    .Code(400)
                    .message("ID가 필요합니다.")
                    .build();
        }
        Optional<Player> entity = playerRepository.findById(playerModel.getId());
        if (entity.isPresent()) {
            PlayerModel model = entityToModel(entity.get());
            return Messenger.builder()
                    .Code(200)
                    .message("조회 성공")
                    .data(model)
                    .build();
        } else {
            return Messenger.builder()
                    .Code(404)
                    .message("선수를 찾을 수 없습니다.")
                    .build();
        }
    }

    @Override
    public Messenger findAll() {
        List<Player> entities = playerRepository.findAll();
        List<PlayerModel> modelList = entities.stream()
                .map(this::entityToModel)
                .collect(Collectors.toList());
        return Messenger.builder()
                .Code(200)
                .message("전체 조회 성공: " + modelList.size() + "개")
                .data(modelList)
                .build();
    }

    @Override
    @Transactional
    public Messenger save(PlayerModel playerModel) {
        Player entity = modelToEntity(playerModel);
        Player saved = playerRepository.save(entity);
        PlayerModel model = entityToModel(saved);
        return Messenger.builder()
                .Code(200)
                .message("저장 성공: " + saved.getId())
                .data(model)
                .build();
    }

    @Override
    @Transactional
    public Messenger saveAll(List<PlayerModel> playerModelList) {
        List<Player> entities = playerModelList.stream()
                .map(this::modelToEntity)
                .collect(Collectors.toList());
        
        List<Player> saved = playerRepository.saveAll(entities);
        return Messenger.builder()
                .Code(200)
                .message("일괄 저장 성공: " + saved.size() + "개")
                .build();
    }

    @Override
    @Transactional
    public Messenger update(PlayerModel playerModel) {
        if (playerModel.getId() == null) {
            return Messenger.builder()
                    .Code(400)
                    .message("ID가 필요합니다.")
                    .build();
        }
        Optional<Player> optionalEntity = playerRepository.findById(playerModel.getId());
        if (optionalEntity.isPresent()) {
            Player existing = optionalEntity.get();
            Team team = playerModel.getTeam_uk() != null 
                    ? teamRepository.findByTeam_uk(playerModel.getTeam_uk()).orElse(existing.getTeam()) 
                    : existing.getTeam();
            
            Player updated = Player.builder()
                    .id(existing.getId())
                    .player_uk(playerModel.getPlayer_uk() != null ? playerModel.getPlayer_uk() : existing.getPlayer_uk())
                    .player_name(playerModel.getPlayer_name() != null ? playerModel.getPlayer_name() : existing.getPlayer_name())
                    .e_player_name(playerModel.getE_player_name() != null ? playerModel.getE_player_name() : existing.getE_player_name())
                    .nickname(playerModel.getNickname() != null ? playerModel.getNickname() : existing.getNickname())
                    .join_yyyy(playerModel.getJoin_yyyy() != null ? playerModel.getJoin_yyyy() : existing.getJoin_yyyy())
                    .position(playerModel.getPosition() != null ? playerModel.getPosition() : existing.getPosition())
                    .back_no(playerModel.getBack_no() != null ? playerModel.getBack_no() : existing.getBack_no())
                    .nation(playerModel.getNation() != null ? playerModel.getNation() : existing.getNation())
                    .birth_date(playerModel.getBirth_date() != null ? playerModel.getBirth_date() : existing.getBirth_date())
                    .solar(playerModel.getSolar() != null ? playerModel.getSolar() : existing.getSolar())
                    .height(playerModel.getHeight() != null ? playerModel.getHeight() : existing.getHeight())
                    .weight(playerModel.getWeight() != null ? playerModel.getWeight() : existing.getWeight())
                    .team_uk(playerModel.getTeam_uk() != null ? playerModel.getTeam_uk() : existing.getTeam_uk())
                    .team(team)
                    .build();
            
            Player saved = playerRepository.save(updated);
            PlayerModel model = entityToModel(saved);
            return Messenger.builder()
                    .Code(200)
                    .message("수정 성공: " + playerModel.getId())
                    .data(model)
                    .build();
        } else {
            return Messenger.builder()
                    .Code(404)
                    .message("수정할 선수를 찾을 수 없습니다.")
                    .build();
        }
    }

    @Override
    @Transactional
    public Messenger delete(PlayerModel playerModel) {
        if (playerModel.getId() == null) {
            return Messenger.builder()
                    .Code(400)
                    .message("ID가 필요합니다.")
                    .build();
        }
        Optional<Player> optionalEntity = playerRepository.findById(playerModel.getId());
        if (optionalEntity.isPresent()) {
            playerRepository.deleteById(playerModel.getId());
            return Messenger.builder()
                    .Code(200)
                    .message("삭제 성공: " + playerModel.getId())
                    .build();
        } else {
            return Messenger.builder()
                    .Code(404)
                    .message("삭제할 선수를 찾을 수 없습니다.")
                    .build();
        }
    }

    @Override
    public Messenger findByWord(PlayerModel playerModel) {
        String keyword = playerModel.getPlayer_name();
        if (keyword == null || keyword.trim().isEmpty()) {
            return Messenger.builder()
                    .Code(400)
                    .message("검색어를 입력해주세요.")
                    .data(null)
                    .build();
        }
        
        // 이름으로 검색 (LIKE 검색)
        List<Player> players = playerRepository.findAll().stream()
                .filter(p -> p.getPlayer_name() != null && 
                            (p.getPlayer_name().contains(keyword) || 
                             (p.getE_player_name() != null && p.getE_player_name().contains(keyword)) ||
                             (p.getNickname() != null && p.getNickname().contains(keyword))))
                .collect(Collectors.toList());
        
        List<PlayerModel> modelList = players.stream()
                .map(this::entityToModel)
                .collect(Collectors.toList());
        
        return Messenger.builder()
                .Code(200)
                .message("검색 완료: " + modelList.size() + "개")
                .data(modelList)
                .build();
    }

}

