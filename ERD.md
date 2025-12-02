# Admin ERP 시스템 ERD (Entity Relationship Diagram)

## 개요
이 문서는 admin.aiion.site 관리자 대시보드 시스템의 데이터베이스 구조를 정의합니다.

---

## ERD 다이어그램

```
┌─────────────────────────────────────────────────────────────────┐
│                         Users (사용자)                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ PK: id (BIGINT)                                           │  │
│  │     email (VARCHAR)                                       │  │
│  │     password_hash (VARCHAR) - nullable                   │  │
│  │     name (VARCHAR)                                        │  │
│  │     nickname (VARCHAR) - nullable                         │  │
│  │     phone (VARCHAR) - nullable                            │  │
│  │     role (VARCHAR) - 'ADMIN', 'MANAGER', 'STAFF'         │  │
│  │     status (VARCHAR) - 'ACTIVE', 'INACTIVE', 'SUSPENDED' │  │
│  │     kakao_id (VARCHAR) - nullable                         │  │
│  │     naver_id (VARCHAR) - nullable                         │  │
│  │     google_id (VARCHAR) - nullable                        │  │
│  │     created_at (TIMESTAMP)                                │  │
│  │     updated_at (TIMESTAMP)                                │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ 1:N
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Customers (고객)                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ PK: id (VARCHAR) - 'CUST-001'                            │  │
│  │     name (VARCHAR)                                        │  │
│  │     email (VARCHAR)                                       │  │
│  │     phone (VARCHAR)                                       │  │
│  │     type (VARCHAR) - '기업', '개인'                        │  │
│  │     status (VARCHAR) - '활성', '비활성'                    │  │
│  │     address (TEXT) - nullable                             │  │
│  │     company_name (VARCHAR) - nullable                     │  │
│  │     business_number (VARCHAR) - nullable                  │  │
│  │     contact_person (VARCHAR) - nullable                   │  │
│  │     notes (TEXT) - nullable                               │  │
│  │     created_at (TIMESTAMP)                                │  │
│  │     updated_at (TIMESTAMP)                                │  │
│  │     created_by (BIGINT) - FK → Users.id                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ 1:N
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Orders (주문)                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ PK: id (VARCHAR) - 'ORD-2024-001'                       │  │
│  │     customer_id (VARCHAR) - FK → Customers.id            │  │
│  │     order_date (DATE)                                    │  │
│  │     status (VARCHAR) - '주문완료', '배송중', '배송준비',   │  │
│  │                        '취소됨', '반품'                   │  │
│  │     total_amount (DECIMAL(15,2))                         │  │
│  │     shipping_address (TEXT)                              │  │
│  │     shipping_cost (DECIMAL(10,2)) - default 0            │  │
│  │     payment_method (VARCHAR) - nullable                  │  │
│  │     payment_status (VARCHAR) - nullable                  │  │
│  │     notes (TEXT) - nullable                               │  │
│  │     created_at (TIMESTAMP)                                │  │
│  │     updated_at (TIMESTAMP)                                │  │
│  │     created_by (BIGINT) - FK → Users.id                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ 1:N
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  OrderItems (주문 항목)                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ PK: id (BIGINT)                                           │  │
│  │     order_id (VARCHAR) - FK → Orders.id                   │  │
│  │     product_id (VARCHAR) - FK → Products.id                │  │
│  │     quantity (INTEGER)                                    │  │
│  │     unit_price (DECIMAL(10,2))                            │  │
│  │     total_price (DECIMAL(12,2))                           │  │
│  │     created_at (TIMESTAMP)                                │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Products (제품/재고)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ PK: id (VARCHAR) - 'INV-001'                             │  │
│  │     name (VARCHAR)                                        │  │
│  │     category (VARCHAR)                                    │  │
│  │     description (TEXT) - nullable                          │  │
│  │     quantity (INTEGER) - default 0                        │  │
│  │     unit_price (DECIMAL(10,2))                            │  │
│  │     cost_price (DECIMAL(10,2)) - nullable                 │  │
│  │     status (VARCHAR) - '재고있음', '재고부족', '품절'     │  │
│  │     location (VARCHAR) - nullable                         │  │
│  │     min_stock_level (INTEGER) - nullable                  │  │
│  │     max_stock_level (INTEGER) - nullable                  │  │
│  │     supplier (VARCHAR) - nullable                         │  │
│  │     sku (VARCHAR) - nullable (Stock Keeping Unit)          │  │
│  │     barcode (VARCHAR) - nullable                           │  │
│  │     image_url (VARCHAR) - nullable                         │  │
│  │     created_at (TIMESTAMP)                                │  │
│  │     updated_at (TIMESTAMP)                                │  │
│  │     created_by (BIGINT) - FK → Users.id                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ 1:N
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              InventoryTransactions (재고 거래)                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ PK: id (BIGINT)                                           │  │
│  │     product_id (VARCHAR) - FK → Products.id              │  │
│  │     transaction_type (VARCHAR) - '입고', '출고', '조정'    │  │
│  │     quantity (INTEGER) - 양수: 입고, 음수: 출고          │  │
│  │     reference_type (VARCHAR) - nullable                  │  │
│  │     reference_id (VARCHAR) - nullable (주문ID 등)         │  │
│  │     notes (TEXT) - nullable                               │  │
│  │     created_at (TIMESTAMP)                                │  │
│  │     created_by (BIGINT) - FK → Users.id                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  Transactions (거래/재무)                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ PK: id (VARCHAR) - 'TXN-001'                              │  │
│  │     transaction_date (DATE)                               │  │
│  │     type (VARCHAR) - '수입', '지출'                        │  │
│  │     category (VARCHAR) - '매출', '구매', '운영', '기타'    │  │
│  │     description (VARCHAR)                                 │  │
│  │     amount (DECIMAL(15,2))                                │  │
│  │     payment_method (VARCHAR) - nullable                   │  │
│  │     reference_type (VARCHAR) - nullable                   │  │
│  │     reference_id (VARCHAR) - nullable (주문ID 등)         │  │
│  │     account_id (VARCHAR) - nullable                       │  │
│  │     notes (TEXT) - nullable                               │  │
│  │     created_at (TIMESTAMP)                                │  │
│  │     updated_at (TIMESTAMP)                                │  │
│  │     created_by (BIGINT) - FK → Users.id                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      Reports (보고서)                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ PK: id (VARCHAR) - 'RPT-001'                             │  │
│  │     name (VARCHAR)                                       │  │
│  │     type (VARCHAR) - '매출', '재고', '고객', '재무',     │  │
│  │                      '주문'                              │  │
│  │     period (VARCHAR)                                     │  │
│  │     status (VARCHAR) - '완료', '진행중', '실패'           │  │
│  │     template_id (VARCHAR) - nullable                    │  │
│  │     parameters (JSON) - nullable                          │  │
│  │     file_path (VARCHAR) - nullable                        │  │
│  │     generated_date (DATE) - nullable                     │  │
│  │     created_at (TIMESTAMP)                                │  │
│  │     created_by (BIGINT) - FK → Users.id                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 테이블 상세 정의

### 1. Users (사용자/관리자)
관리자 시스템 사용자 정보를 저장합니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | BIGINT | PK, AUTO_INCREMENT | 사용자 고유 ID |
| email | VARCHAR(255) | UNIQUE, NOT NULL | 이메일 주소 |
| password_hash | VARCHAR(255) | NULL | 비밀번호 해시 (OAuth 사용자는 NULL) |
| name | VARCHAR(100) | NOT NULL | 이름 |
| nickname | VARCHAR(100) | NULL | 닉네임 |
| phone | VARCHAR(20) | NULL | 전화번호 |
| role | VARCHAR(20) | NOT NULL, DEFAULT 'STAFF' | 역할: ADMIN, MANAGER, STAFF |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'ACTIVE' | 상태: ACTIVE, INACTIVE, SUSPENDED |
| kakao_id | VARCHAR(100) | NULL, UNIQUE | 카카오 OAuth ID |
| naver_id | VARCHAR(100) | NULL, UNIQUE | 네이버 OAuth ID |
| google_id | VARCHAR(100) | NULL, UNIQUE | 구글 OAuth ID |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 생성일시 |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE | 수정일시 |

**인덱스:**
- `idx_email` ON email
- `idx_kakao_id` ON kakao_id
- `idx_naver_id` ON naver_id
- `idx_google_id` ON google_id

---

### 2. Customers (고객)
고객 정보를 저장합니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | VARCHAR(50) | PK | 고객 ID (예: CUST-001) |
| name | VARCHAR(200) | NOT NULL | 고객명 |
| email | VARCHAR(255) | NOT NULL | 이메일 |
| phone | VARCHAR(20) | NOT NULL | 전화번호 |
| type | VARCHAR(20) | NOT NULL | 유형: 기업, 개인 |
| status | VARCHAR(20) | NOT NULL, DEFAULT '활성' | 상태: 활성, 비활성 |
| address | TEXT | NULL | 주소 |
| company_name | VARCHAR(200) | NULL | 회사명 (기업인 경우) |
| business_number | VARCHAR(50) | NULL | 사업자등록번호 |
| contact_person | VARCHAR(100) | NULL | 담당자명 |
| notes | TEXT | NULL | 메모 |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 생성일시 |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE | 수정일시 |
| created_by | BIGINT | FK → Users.id | 생성자 |

**인덱스:**
- `idx_email` ON email
- `idx_status` ON status
- `idx_created_by` ON created_by

**계산 필드 (가상):**
- `total_orders`: 주문 테이블에서 집계
- `total_amount`: 주문 테이블에서 집계

---

### 3. Products (제품/재고)
제품 및 재고 정보를 저장합니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | VARCHAR(50) | PK | 제품 ID (예: INV-001) |
| name | VARCHAR(200) | NOT NULL | 제품명 |
| category | VARCHAR(100) | NOT NULL | 카테고리 |
| description | TEXT | NULL | 설명 |
| quantity | INTEGER | NOT NULL, DEFAULT 0 | 재고 수량 |
| unit_price | DECIMAL(10,2) | NOT NULL | 단가 |
| cost_price | DECIMAL(10,2) | NULL | 원가 |
| status | VARCHAR(20) | NOT NULL, DEFAULT '재고있음' | 상태: 재고있음, 재고부족, 품절 |
| location | VARCHAR(100) | NULL | 창고 위치 |
| min_stock_level | INTEGER | NULL | 최소 재고 수준 |
| max_stock_level | INTEGER | NULL | 최대 재고 수준 |
| supplier | VARCHAR(200) | NULL | 공급업체 |
| sku | VARCHAR(100) | NULL, UNIQUE | 재고 관리 단위 코드 |
| barcode | VARCHAR(100) | NULL, UNIQUE | 바코드 |
| image_url | VARCHAR(500) | NULL | 제품 이미지 URL |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 생성일시 |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE | 수정일시 |
| created_by | BIGINT | FK → Users.id | 생성자 |

**인덱스:**
- `idx_category` ON category
- `idx_status` ON status
- `idx_sku` ON sku
- `idx_barcode` ON barcode
- `idx_created_by` ON created_by

**트리거:**
- `quantity` 변경 시 `status` 자동 업데이트
  - `quantity = 0` → status = '품절'
  - `quantity < min_stock_level` → status = '재고부족'
  - 그 외 → status = '재고있음'

---

### 4. Orders (주문)
주문 정보를 저장합니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | VARCHAR(50) | PK | 주문 ID (예: ORD-2024-001) |
| customer_id | VARCHAR(50) | FK → Customers.id, NOT NULL | 고객 ID |
| order_date | DATE | NOT NULL | 주문일 |
| status | VARCHAR(20) | NOT NULL, DEFAULT '주문완료' | 상태: 주문완료, 배송중, 배송준비, 취소됨, 반품 |
| total_amount | DECIMAL(15,2) | NOT NULL | 총 주문 금액 |
| shipping_address | TEXT | NOT NULL | 배송 주소 |
| shipping_cost | DECIMAL(10,2) | NOT NULL, DEFAULT 0 | 배송비 |
| payment_method | VARCHAR(50) | NULL | 결제 방법 |
| payment_status | VARCHAR(20) | NULL | 결제 상태 |
| notes | TEXT | NULL | 메모 |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 생성일시 |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE | 수정일시 |
| created_by | BIGINT | FK → Users.id | 생성자 |

**인덱스:**
- `idx_customer_id` ON customer_id
- `idx_order_date` ON order_date
- `idx_status` ON status
- `idx_created_by` ON created_by

---

### 5. OrderItems (주문 항목)
주문에 포함된 제품 목록을 저장합니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | BIGINT | PK, AUTO_INCREMENT | 주문 항목 ID |
| order_id | VARCHAR(50) | FK → Orders.id, NOT NULL | 주문 ID |
| product_id | VARCHAR(50) | FK → Products.id, NOT NULL | 제품 ID |
| quantity | INTEGER | NOT NULL | 수량 |
| unit_price | DECIMAL(10,2) | NOT NULL | 단가 (주문 시점 가격) |
| total_price | DECIMAL(12,2) | NOT NULL | 총액 (quantity × unit_price) |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 생성일시 |

**인덱스:**
- `idx_order_id` ON order_id
- `idx_product_id` ON product_id

**트리거:**
- `total_price` 자동 계산: `quantity × unit_price`

---

### 6. InventoryTransactions (재고 거래)
재고 입출고 내역을 저장합니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | BIGINT | PK, AUTO_INCREMENT | 거래 ID |
| product_id | VARCHAR(50) | FK → Products.id, NOT NULL | 제품 ID |
| transaction_type | VARCHAR(20) | NOT NULL | 거래 유형: 입고, 출고, 조정 |
| quantity | INTEGER | NOT NULL | 수량 (양수: 입고, 음수: 출고) |
| reference_type | VARCHAR(50) | NULL | 참조 유형 (예: 'ORDER', 'PURCHASE') |
| reference_id | VARCHAR(50) | NULL | 참조 ID (주문 ID 등) |
| notes | TEXT | NULL | 메모 |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 생성일시 |
| created_by | BIGINT | FK → Users.id | 생성자 |

**인덱스:**
- `idx_product_id` ON product_id
- `idx_transaction_type` ON transaction_type
- `idx_reference` ON (reference_type, reference_id)
- `idx_created_at` ON created_at

**트리거:**
- 재고 거래 생성 시 `Products.quantity` 자동 업데이트

---

### 7. Transactions (거래/재무)
재무 거래 내역을 저장합니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | VARCHAR(50) | PK | 거래 ID (예: TXN-001) |
| transaction_date | DATE | NOT NULL | 거래일 |
| type | VARCHAR(20) | NOT NULL | 유형: 수입, 지출 |
| category | VARCHAR(50) | NOT NULL | 카테고리: 매출, 구매, 운영, 기타 |
| description | VARCHAR(500) | NOT NULL | 설명 |
| amount | DECIMAL(15,2) | NOT NULL | 금액 (양수: 수입, 음수: 지출) |
| payment_method | VARCHAR(50) | NULL | 결제 방법 |
| reference_type | VARCHAR(50) | NULL | 참조 유형 (예: 'ORDER') |
| reference_id | VARCHAR(50) | NULL | 참조 ID (주문 ID 등) |
| account_id | VARCHAR(50) | NULL | 계정 ID |
| notes | TEXT | NULL | 메모 |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 생성일시 |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE | 수정일시 |
| created_by | BIGINT | FK → Users.id | 생성자 |

**인덱스:**
- `idx_transaction_date` ON transaction_date
- `idx_type` ON type
- `idx_category` ON category
- `idx_reference` ON (reference_type, reference_id)
- `idx_created_by` ON created_by

---

### 8. Reports (보고서)
생성된 보고서 정보를 저장합니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | VARCHAR(50) | PK | 보고서 ID (예: RPT-001) |
| name | VARCHAR(200) | NOT NULL | 보고서명 |
| type | VARCHAR(50) | NOT NULL | 유형: 매출, 재고, 고객, 재무, 주문 |
| period | VARCHAR(100) | NOT NULL | 기간 (예: '2024년 1월') |
| status | VARCHAR(20) | NOT NULL, DEFAULT '진행중' | 상태: 완료, 진행중, 실패 |
| template_id | VARCHAR(50) | NULL | 템플릿 ID |
| parameters | JSON | NULL | 보고서 생성 파라미터 |
| file_path | VARCHAR(500) | NULL | 생성된 파일 경로 |
| generated_date | DATE | NULL | 생성일 |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 생성일시 |
| created_by | BIGINT | FK → Users.id | 생성자 |

**인덱스:**
- `idx_type` ON type
- `idx_status` ON status
- `idx_created_by` ON created_by
- `idx_generated_date` ON generated_date

---

## 관계 (Relationships)

### 1. Users → Customers (1:N)
- 한 사용자가 여러 고객을 생성할 수 있습니다.
- `Customers.created_by` → `Users.id`

### 2. Customers → Orders (1:N)
- 한 고객이 여러 주문을 할 수 있습니다.
- `Orders.customer_id` → `Customers.id`

### 3. Orders → OrderItems (1:N)
- 한 주문에 여러 주문 항목이 포함될 수 있습니다.
- `OrderItems.order_id` → `Orders.id`

### 4. Products → OrderItems (1:N)
- 한 제품이 여러 주문 항목에 포함될 수 있습니다.
- `OrderItems.product_id` → `Products.id`

### 5. Products → InventoryTransactions (1:N)
- 한 제품에 대한 여러 재고 거래가 발생할 수 있습니다.
- `InventoryTransactions.product_id` → `Products.id`

### 6. Users → Orders (1:N)
- 한 사용자가 여러 주문을 생성할 수 있습니다.
- `Orders.created_by` → `Users.id`

### 7. Users → Products (1:N)
- 한 사용자가 여러 제품을 생성할 수 있습니다.
- `Products.created_by` → `Users.id`

### 8. Users → Transactions (1:N)
- 한 사용자가 여러 거래를 생성할 수 있습니다.
- `Transactions.created_by` → `Users.id`

### 9. Users → Reports (1:N)
- 한 사용자가 여러 보고서를 생성할 수 있습니다.
- `Reports.created_by` → `Users.id`

---

## 비즈니스 규칙

### 1. 주문 처리 규칙
- 주문 생성 시 `OrderItems`가 함께 생성됩니다.
- 주문 완료 시 `Products.quantity`가 자동으로 차감됩니다.
- 주문 완료 시 `InventoryTransactions`에 출고 기록이 생성됩니다.
- 주문 완료 시 `Transactions`에 수입 거래가 생성됩니다.

### 2. 재고 관리 규칙
- `Products.quantity`는 `InventoryTransactions`를 통해서만 변경됩니다.
- 재고 입고 시 `transaction_type = '입고'`, `quantity > 0`
- 재고 출고 시 `transaction_type = '출고'`, `quantity < 0`
- 재고 조정 시 `transaction_type = '조정'`

### 3. 재고 상태 자동 업데이트
- `quantity = 0` → `status = '품절'`
- `quantity < min_stock_level` → `status = '재고부족'`
- 그 외 → `status = '재고있음'`

### 4. 고객 통계 계산
- `Customers.total_orders`: `Orders` 테이블에서 집계
- `Customers.total_amount`: `Orders.total_amount` 합계

### 5. 보고서 생성 규칙
- 보고서 생성 시 `status = '진행중'`
- 생성 완료 시 `status = '완료'`, `generated_date` 설정
- 생성 실패 시 `status = '실패'`

---

## 인덱스 전략

### 주요 인덱스
1. **외래키 인덱스**: 모든 FK 컬럼에 인덱스 생성
2. **조회 필터 인덱스**: `status`, `type`, `category` 등 필터링에 자주 사용되는 컬럼
3. **날짜 인덱스**: `order_date`, `transaction_date`, `created_at` 등
4. **검색 인덱스**: `email`, `name`, `sku`, `barcode` 등

---

## 데이터 무결성

### 제약조건
- **NOT NULL**: 필수 필드
- **UNIQUE**: 중복 방지 (email, OAuth ID, SKU, barcode 등)
- **CHECK**: 상태 값 검증 (ENUM 대신 CHECK 제약조건 사용 가능)
- **FOREIGN KEY**: 참조 무결성 보장
- **DEFAULT**: 기본값 설정

### 트리거
- 재고 수량 자동 업데이트
- 재고 상태 자동 계산
- 주문 항목 총액 자동 계산

---

## 확장 고려사항

### 향후 추가 가능한 테이블
1. **Suppliers (공급업체)**: 제품 공급업체 정보
2. **Warehouses (창고)**: 창고 정보
3. **Shipping (배송)**: 배송 정보
4. **PaymentMethods (결제수단)**: 결제 수단 정보
5. **ReportTemplates (보고서 템플릿)**: 보고서 템플릿 정보
6. **AuditLogs (감사 로그)**: 시스템 변경 이력

---

## 버전 정보
- **작성일**: 2025-12-02
- **버전**: 1.0.0
- **작성자**: AI Assistant
- **기반**: admin.aiion.site 화면 분석

