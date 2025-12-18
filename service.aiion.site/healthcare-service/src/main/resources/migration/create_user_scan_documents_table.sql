-- 스캔된 건강 문서 테이블 생성
-- 실행 날짜: 2025-12-04

CREATE TABLE IF NOT EXISTS user_scan_documents (
    doc_id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    doc_type VARCHAR(50),
    uploaded_at TIMESTAMP NOT NULL,
    parsed_data JSONB,
    hospital_suggestion TEXT
);

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_user_scan_documents_user_id ON user_scan_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_scan_documents_uploaded_at ON user_scan_documents(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_user_scan_documents_user_id_uploaded_at ON user_scan_documents(user_id, uploaded_at);
CREATE INDEX IF NOT EXISTS idx_user_scan_documents_doc_type ON user_scan_documents(doc_type);

-- JSONB 인덱스 (parsed_data 조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_user_scan_documents_parsed_data ON user_scan_documents USING GIN (parsed_data);

-- 코멘트 추가
COMMENT ON TABLE user_scan_documents IS '스캔된 건강 문서 테이블';
COMMENT ON COLUMN user_scan_documents.doc_id IS '문서 ID';
COMMENT ON COLUMN user_scan_documents.user_id IS '사용자 ID (users 테이블의 id와 매핑)';
COMMENT ON COLUMN user_scan_documents.doc_type IS '문서 종류 (인바디, 건강검진, 진단서 등)';
COMMENT ON COLUMN user_scan_documents.uploaded_at IS '업로드 시각';
COMMENT ON COLUMN user_scan_documents.parsed_data IS 'OCR/AI로 추출된 주요 정보';
COMMENT ON COLUMN user_scan_documents.hospital_suggestion IS '병원 추천 또는 질병 추정 결과';

