package site.aiion.api.healthcare;

import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public class HealthcareRepositoryImpl implements HealthcareRepositoryCustom {
    private final JPAQueryFactory queryFactory;
}

