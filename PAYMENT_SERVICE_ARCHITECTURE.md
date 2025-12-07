# Payment Service 아키텍처 설계

## 개요

결제 기능을 별도의 `payment-service`로 분리하여 보안, 트랜잭션 무결성, 확장성을 보장합니다.

## 서비스 분리 전략

### 1. account-service (가계부 기록 관리)
**역할**: 가계부 기록 CRUD
- ✅ 가계부 기록 조회
- ✅ 가계부 기록 생성/수정/삭제
- ✅ 가계부 통계 및 분석
- ❌ 실제 결제 처리 (제외)

### 2. payment-service (결제 처리)
**역할**: 실제 결제 처리
- ✅ Toss Payments API 연동
- ✅ 결제 요청 처리
- ✅ 결제 승인/취소
- ✅ 결제 내역 저장 (account-service와 연동)
- ✅ 결제 검증 및 보안

### 3. chatbot-service (정보 제공)
**역할**: 가계부 정보 조회만 (읽기 전용)
- ✅ 가계부 정보 조회 (account-service 호출)
- ✅ 사용자에게 정보 제공
- ❌ 가계부 기록 저장 (제외)
- ❌ 결제 처리 (제외)

## 아키텍처 다이어그램

```
┌─────────────┐
│ 프론트엔드   │
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
   ▼       ▼
┌─────────┐  ┌──────────────┐  ┌──────────────┐
│ 챗봇    │  │ account-service│  │payment-service│
│ (조회만) │  │ (가계부 CRUD) │  │ (결제 처리)   │
└─────────┘  └──────────────┘  └──────────────┘
     │              │                    │
     │              │                    │
     └──────────────┴────────────────────┘
                    │
                    ▼
              ┌──────────┐
              │  Neon DB  │
              └──────────┘
```

## 데이터 흐름

### 시나리오 1: 가계부 조회 (챗봇)
```
사용자: "이번 달 지출 얼마야?"
  ↓
챗봇 → account-service (GET /accounts/user/{userId})
  ↓
account-service → DB 조회
  ↓
챗봇 → GPT로 답변 생성
  ↓
사용자에게 정보 제공
```

### 시나리오 2: 가계부 기록 저장 (프론트엔드 직접)
```
사용자: "10000원 지출 기록해줘"
  ↓
프론트엔드 → account-service (POST /accounts)
  ↓
account-service → DB 저장
  ↓
사용자에게 확인
```

### 시나리오 3: 프리미엄 구독 결제 (프론트엔드 직접)
```
사용자: "프리미엄 구독 결제해줘" 또는 "월간 구독 결제"
  ↓
프론트엔드 → payment-service (POST /payments/subscription)
  ↓
payment-service → Toss Payments API 호출
  ↓
결제 승인 → user-service (사용자 구독 상태 업데이트)
  ↓
사용자에게 구독 완료 알림
```

### 시나리오 4: 가계부 기록을 위한 결제 (실제 돈이 나가는 경우)
```
사용자: "마트에서 10000원 결제했어" (실제 결제 후 기록)
  ↓
프론트엔드 → account-service (POST /accounts) 직접 저장
  ↓
account-service → DB 저장
  ↓
사용자에게 기록 완료 확인
```

**참고**: 가계부 기록은 실제 결제가 아니라 **기록만** 저장하므로 payment-service를 거치지 않습니다.

## payment-service 구조

### 포트
- **8091**: payment-service HTTP 포트

### 주요 엔드포인트

#### 1. 프리미엄 구독 결제 요청
```
POST /payments/subscription
Request Body:
{
  "userId": 1,
  "subscriptionType": "MONTHLY",  // MONTHLY, YEARLY
  "planName": "프리미엄 플랜",
  "amount": 9900,  // 월간 구독료
  "customerName": "홍길동",
  "customerEmail": "user@example.com"
}

Response:
{
  "paymentId": "PAYMENT-12345",
  "checkoutUrl": "https://pay.toss.im/...",
  "status": "PENDING",
  "subscriptionType": "MONTHLY"
}
```

#### 1-1. 추가 기능 구매 (선택사항)
```
POST /payments/feature
Request Body:
{
  "userId": 1,
  "featureType": "AI_ANALYSIS",  // AI_ANALYSIS, BACKUP, TEMPLATE, AD_REMOVAL
  "featureName": "AI 감정 분석",
  "amount": 5000,
  "customerName": "홍길동",
  "customerEmail": "user@example.com"
}

Response:
{
  "paymentId": "PAYMENT-12345",
  "checkoutUrl": "https://pay.toss.im/...",
  "status": "PENDING",
  "featureType": "AI_ANALYSIS"
}
```

#### 2. 결제 승인
```
POST /payments/confirm
Request Body:
{
  "paymentId": "PAYMENT-12345",
  "paymentKey": "payment_key_from_toss",
  "orderId": "ORDER-12345",
  "amount": 9900
}

Response:
{
  "paymentId": "PAYMENT-12345",
  "status": "APPROVED",
  "approvedAt": "2024-01-01T12:00:00Z",
  "subscriptionType": "MONTHLY",  // 또는 featureType
  "userId": 1,
  "expiresAt": "2024-02-01T12:00:00Z"  // 구독 만료일
}
```

#### 3. 결제 취소
```
POST /payments/{paymentId}/cancel
Request Body:
{
  "cancelReason": "사용자 요청",
  "cancelAmount": 10000
}

Response:
{
  "paymentId": "PAYMENT-12345",
  "status": "CANCELLED",
  "cancelledAt": "2024-01-01T12:00:00Z"
}
```

#### 4. 결제 조회
```
GET /payments/{paymentId}

Response:
{
  "paymentId": "PAYMENT-12345",
  "status": "APPROVED",
  "amount": 10000,
  "orderId": "ORDER-12345",
  "approvedAt": "2024-01-01T12:00:00Z",
  "accountId": 123
}
```

## 보안 고려사항

### 1. 인증/인가
- JWT 토큰 기반 인증
- 사용자별 결제 권한 검증
- 결제 금액 제한 설정

### 2. 데이터 보안
- 결제 정보 암호화 저장
- 민감 정보 로깅 제외
- PCI DSS 준수 (필요 시)

### 3. 트랜잭션 무결성
- DB 트랜잭션으로 원자성 보장
- 결제 실패 시 롤백 처리
- 중복 결제 방지

## user-service와의 연동

### 구독 결제 완료 후 사용자 구독 상태 업데이트
```java
// payment-service에서 결제 승인 후
@Transactional
public PaymentResponse confirmPayment(PaymentConfirmRequest request) {
    // 1. Toss Payments API 호출
    TossPaymentResponse tossResponse = tossPaymentsClient.confirm(request);
    
    // 2. 결제 정보 저장
    Payment payment = savePayment(tossResponse);
    
    // 3. user-service에 구독 상태 업데이트
    if (payment.getSubscriptionType() != null) {
        SubscriptionUpdateRequest subscriptionRequest = SubscriptionUpdateRequest.builder()
            .userId(request.getUserId())
            .subscriptionType(payment.getSubscriptionType())
            .isPremium(true)
            .expiresAt(payment.getExpiresAt())
            .build();
        
        userServiceClient.updateSubscription(subscriptionRequest);
    }
    
    // 4. 추가 기능 구매인 경우 user-service에 기능 활성화
    if (payment.getFeatureType() != null) {
        FeatureActivationRequest featureRequest = FeatureActivationRequest.builder()
            .userId(request.getUserId())
            .featureType(payment.getFeatureType())
            .build();
        
        userServiceClient.activateFeature(featureRequest);
    }
    
    return PaymentResponse.from(payment);
}
```

## account-service와의 연동 (선택사항)

### 구독료를 가계부에 기록하고 싶은 경우
```java
// payment-service에서 결제 승인 후 (선택사항)
if (shouldRecordToAccount(payment)) {
    // account-service에 가계부 기록 저장
    AccountModel accountModel = AccountModel.builder()
        .userId(request.getUserId())
        .type("EXPENSE")
        .amount(request.getAmount())
        .transactionDate(LocalDate.now())
        .description("프리미엄 구독료: " + payment.getSubscriptionType())
        .paymentMethod("TOSS")
        .category("구독")
        .build();
    
    accountServiceClient.save(accountModel);
}
```

**참고**: 가계부 기록은 선택사항입니다. 구독료를 가계부에 기록할지 여부는 비즈니스 요구사항에 따라 결정합니다.

## 구현 단계

### Phase 1: 기본 구조
1. ✅ payment-service 프로젝트 생성
2. ✅ Docker 설정 추가
3. ✅ API Gateway 라우팅 설정
4. ✅ 기본 엔드포인트 구현

### Phase 2: Toss Payments 연동
1. Toss Payments SDK 추가
2. 결제 요청/승인/취소 구현
3. 웹훅 처리 (선택사항)

### Phase 3: account-service 연동
1. account-service 클라이언트 구현
2. 결제 완료 후 가계부 기록 자동 저장
3. 트랜잭션 처리

### Phase 4: 보안 강화
1. JWT 인증 추가
2. 결제 금액 검증
3. 중복 결제 방지

## 환경 변수

```yaml
# payment-service
TOSS_PAYMENTS_SECRET_KEY: ${TOSS_PAYMENTS_SECRET_KEY}
TOSS_PAYMENTS_CLIENT_KEY: ${TOSS_PAYMENTS_CLIENT_KEY}
ACCOUNT_SERVICE_URL: http://account-service:8089
JWT_SECRET: ${JWT_SECRET}
```

## API Gateway 라우팅

```yaml
- id: payment-service
  uri: http://payment-service:8091
  predicates:
    - Path=/payment/**
  filters:
    - StripPrefix=1
```

## 참고사항

1. **챗봇에서 결제 처리 금지**
   - 보안상 챗봇을 통한 결제는 위험
   - 프론트엔드에서 직접 payment-service 호출

2. **가계부 기록 저장**
   - 챗봇에서 저장하지 않음
   - 프론트엔드 → account-service 직접 호출
   - 또는 payment-service → account-service 자동 연동

3. **서비스 간 통신**
   - payment-service → account-service: HTTP 클라이언트
   - 비동기 처리 고려 (선택사항)

