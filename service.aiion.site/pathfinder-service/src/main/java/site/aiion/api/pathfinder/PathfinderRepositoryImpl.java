package site.aiion.api.pathfinder;

import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public class PathfinderRepositoryImpl implements PathfinderRepositoryCustom {
    private final JPAQueryFactory queryFactory;
}

