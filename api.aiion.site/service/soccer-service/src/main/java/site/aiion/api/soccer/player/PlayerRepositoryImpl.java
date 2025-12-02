package site.aiion.api.soccer.player;

import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public class PlayerRepositoryImpl implements PlayerRepositoryCustom
{
   private final JPAQueryFactory queryFactory;
}
