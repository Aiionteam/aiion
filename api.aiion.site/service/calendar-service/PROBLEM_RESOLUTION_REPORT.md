# Calendar Service 문제 해결 보고서

## 📋 문제 개요

Calendar Service 개발 및 배포 과정에서 발생한 주요 문제들과 해결 방법을 정리한 보고서입니다.

---

## 🔴 문제 1: Docker 빌드 실패 - 메인 클래스 없음

### 증상
```
FAILURE: Build failed with an exception.
> Error while evaluating property 'mainClass' of task ':service:calendar-service:bootJar'.
   > Main class name has not been configured and it could not be resolved from classpath
```

### 원인
- Spring Boot 애플리케이션에 `@SpringBootApplication` 어노테이션이 있는 메인 클래스가 없었음
- 다른 서비스(diary-service, user-service 등)는 메인 클래스가 있었지만, calendar-service는 누락됨

### 해결 방법
**파일 생성**: `CalendarServiceApplication.java`
```java
package site.aiion.api.calendar;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.context.annotation.ComponentScan;

@EnableDiscoveryClient
@SpringBootApplication
@ComponentScan(basePackages = {"site.aiion.api.calendar", "site.aiion.api.config", "site.aiion.api.domain"})
@EntityScan(basePackages = {"site.aiion.api.calendar"})
public class CalendarServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(CalendarServiceApplication.class, args);
    }
}
```

### 예방 방법
1. **새 서비스 생성 시 체크리스트**:
   - [ ] 메인 클래스 생성 (`*ServiceApplication.java`)
   - [ ] `@SpringBootApplication` 어노테이션 확인
   - [ ] `ComponentScan` 패키지 경로 확인
   - [ ] `EntityScan` 패키지 경로 확인
   - [ ] Docker 빌드 테스트

2. **템플릿 사용**: 다른 서비스의 메인 클래스를 템플릿으로 복사 후 패키지명만 변경

---

## 🔴 문제 2: Event 저장 시 500 Internal Server Error

### 증상
```
POST http://localhost:8080/calendar/events 500 (Internal Server Error)
응답: {timestamp: '...', status: 500, error: 'Internal Server Error', path: '/events'}
```

### 원인 분석
1. **프론트엔드 문제**: 새로 생성하는 Event에 임시 `id`를 포함하여 전송
   ```typescript
   // 문제 코드
   const eventModel: EventModel = {
     id: event.id ? parseInt(event.id) : undefined,  // 임시 ID 전송
     // ...
   };
   ```

2. **백엔드 문제**: 
   - 새로 생성하는 경우에도 `id`가 있으면 DB에 저장 시도
   - 예외 처리 부족으로 상세 오류 메시지 확인 불가

### 해결 방법

#### 프론트엔드 수정 (`useCalendarApi.ts`)
```typescript
function eventToModel(event: Event, userId: number): EventModel {
  const eventModel: EventModel = {
    // ✅ 새로 생성하는 경우 id를 전송하지 않음 (백엔드에서 자동 생성)
    // id는 업데이트 시에만 전송
    id: undefined,  // ← 수정
    userId: userId,
    // ...
  };
  return eventModel;
}
```

#### 백엔드 수정 (`EventServiceImpl.java`)
```java
@Override
@Transactional
public Messenger save(EventModel eventModel) {
    try {
        // 검증 로직...
        
        // ✅ 새로 생성하는 경우 id를 null로 설정
        if (eventModel.getId() != null) {
            eventModel.setId(null);
        }
        
        Event entity = modelToEntity(eventModel);
        Event saved = eventRepository.save(entity);
        // ...
    } catch (Exception e) {
        // ✅ 예외 처리 추가
        e.printStackTrace();
        return Messenger.builder()
                .Code(500)
                .message("일정 저장 중 오류가 발생했습니다: " + e.getMessage())
                .build();
    }
}
```

### 예방 방법
1. **프론트엔드 개발 규칙**:
   - 새로 생성하는 리소스는 `id`를 전송하지 않음
   - 업데이트하는 리소스만 `id` 전송
   - 명확한 함수 분리: `create*()` vs `update*()`

2. **백엔드 개발 규칙**:
   - `save()` 메서드에서 항상 `id` null 체크
   - 모든 서비스 메서드에 try-catch 예외 처리 추가
   - 상세한 오류 메시지 반환 (디버깅 용이)

3. **코드 리뷰 체크리스트**:
   - [ ] 새로 생성하는 API는 `id`를 받지 않는가?
   - [ ] 예외 처리가 모든 서비스 메서드에 있는가?
   - [ ] 오류 메시지가 충분히 상세한가?

---

## 🔴 문제 3: Task 저장 시 500 Internal Server Error

### 증상
```
POST http://localhost:8080/calendar/tasks 500 (Internal Server Error)
```

### 원인
- Event와 동일한 문제: 새로 생성하는 Task에 `id` 포함하여 전송

### 해결 방법
- Event와 동일한 패턴으로 수정
- `TaskServiceImpl.java`에 동일한 예외 처리 추가
- `useCalendarApi.ts`의 `taskToModel()` 함수에서 `id: undefined` 설정

### 예방 방법
- Event와 동일한 규칙 적용
- **일관성 유지**: 모든 리소스(Event, Task 등)에 동일한 패턴 적용

---

## 📝 공통 교훈 및 베스트 프랙티스

### 1. Spring Boot 서비스 생성 체크리스트
```
□ 메인 클래스 생성 (*ServiceApplication.java)
□ @SpringBootApplication 어노테이션
□ @ComponentScan 패키지 경로 확인
□ @EntityScan 패키지 경로 확인
□ build.gradle 의존성 확인
□ application.yaml 설정 확인
□ Docker 빌드 테스트
```

### 2. REST API 개발 규칙
```
□ CREATE: POST 요청, id 전송하지 않음
□ UPDATE: PUT 요청, id 필수
□ READ: GET 요청
□ DELETE: DELETE 요청, id 필수
```

### 3. 예외 처리 패턴
```java
@Override
@Transactional
public Messenger save(ResourceModel model) {
    try {
        // 검증 로직
        if (model.getRequiredField() == null) {
            return Messenger.builder()
                    .Code(400)
                    .message("필수 필드가 없습니다.")
                    .build();
        }
        
        // 새로 생성하는 경우 id 제거
        if (model.getId() != null) {
            model.setId(null);
        }
        
        // 비즈니스 로직
        Resource entity = modelToEntity(model);
        Resource saved = repository.save(entity);
        
        return Messenger.builder()
                .Code(200)
                .message("저장 성공")
                .data(entityToModel(saved))
                .build();
                
    } catch (Exception e) {
        e.printStackTrace();  // 로깅
        return Messenger.builder()
                .Code(500)
                .message("저장 중 오류: " + e.getMessage())
                .build();
    }
}
```

### 4. 프론트엔드 API 호출 패턴
```typescript
// ✅ CREATE: id 전송하지 않음
function createResource(resource: Resource, userId: number): Promise<Resource> {
  const model: ResourceModel = {
    id: undefined,  // 새로 생성
    userId: userId,
    // ...
  };
  // POST 요청
}

// ✅ UPDATE: id 필수
function updateResource(resource: Resource, userId: number): Promise<Resource> {
  const model: ResourceModel = {
    id: parseInt(resource.id),  // 업데이트
    userId: userId,
    // ...
  };
  // PUT 요청
}
```

---

## 🔍 디버깅 팁

### 1. 500 오류 발생 시 확인 사항
1. **백엔드 로그 확인**: Docker 컨테이너 로그
   ```bash
   docker-compose logs calendar-service
   ```

2. **프론트엔드 콘솔 확인**: 
   - Network 탭에서 요청/응답 확인
   - 전송하는 데이터 형식 확인
   - 응답 메시지 확인

3. **데이터베이스 확인**:
   - 테이블 스키마 확인
   - 제약 조건 확인
   - 데이터 타입 확인

### 2. 빌드 실패 시 확인 사항
1. **메인 클래스 존재 여부**
2. **패키지 구조 확인**
3. **의존성 충돌 확인**
4. **컴파일 오류 확인**

---

## ✅ 검증 방법

### 1. 서비스 생성 후 검증
```bash
# 1. 빌드 테스트
docker-compose build [service-name]

# 2. 컨테이너 시작
docker-compose up -d [service-name]

# 3. 로그 확인
docker-compose logs -f [service-name]

# 4. Health Check
curl http://localhost:[port]/actuator/health
```

### 2. API 테스트
```bash
# CREATE 테스트 (id 없이)
curl -X POST http://localhost:8080/calendar/events \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "title": "테스트", "date": "2025-12-01"}'

# UPDATE 테스트 (id 포함)
curl -X PUT http://localhost:8080/calendar/events \
  -H "Content-Type: application/json" \
  -d '{"id": 1, "userId": 1, "title": "수정", "date": "2025-12-01"}'
```

---

## 📚 참고 자료

- Spring Boot 공식 문서: https://spring.io/projects/spring-boot
- JPA Best Practices: https://docs.spring.io/spring-data/jpa/docs/current/reference/html/
- REST API 설계 가이드: https://restfulapi.net/

---

## 📅 작성일
2025-12-01

## 👤 작성자
AI Assistant (Auto)

---

**이 보고서는 향후 유사한 문제를 방지하고 빠른 해결을 위한 가이드입니다.**

