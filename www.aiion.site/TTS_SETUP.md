# TTS (Text-to-Speech) 설정 가이드

## 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 환경 변수를 설정하세요:

```env
# TTS 서비스 선택 (web, google, azure, clova)
NEXT_PUBLIC_TTS_SERVICE=web

# Google Cloud TTS API
# https://console.cloud.google.com/apis/credentials
GOOGLE_TTS_API_KEY=your_google_tts_api_key_here

# Azure Speech Service
# https://portal.azure.com/
AZURE_SPEECH_KEY=your_azure_speech_key_here
AZURE_SPEECH_REGION=koreacentral

# CLOVA Voice (Naver Cloud Platform)
# https://www.ncloud.com/
CLOVA_CLIENT_ID=your_clova_client_id_here
CLOVA_CLIENT_SECRET=your_clova_client_secret_here
```

## TTS 서비스별 설정 방법

### 1. Web Speech API (기본, 설정 불필요)
- 브라우저 내장 TTS 사용
- 별도 API 키 불필요
- 품질: 보통

### 2. Google Cloud TTS
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 생성 또는 선택
3. "APIs & Services" > "Library"에서 "Cloud Text-to-Speech API" 활성화
4. "Credentials"에서 API 키 생성
5. `.env.local`에 `GOOGLE_TTS_API_KEY` 설정
6. `NEXT_PUBLIC_TTS_SERVICE=google` 설정

**사용 가능한 음성:**
- `ko-KR-Standard-A` (여성)
- `ko-KR-Standard-B` (남성)
- `ko-KR-Standard-C` (여성)
- `ko-KR-Standard-D` (남성)
- `ko-KR-Wavenet-A` (고품질 여성)
- `ko-KR-Wavenet-B` (고품질 남성)

### 3. Azure Speech Service
1. [Azure Portal](https://portal.azure.com/) 접속
2. "Speech Services" 리소스 생성
3. 리소스의 "Keys and Endpoint"에서 키와 리전 확인
4. `.env.local`에 설정:
   - `AZURE_SPEECH_KEY`: 키 값
   - `AZURE_SPEECH_REGION`: 리전 (예: `koreacentral`)
5. `NEXT_PUBLIC_TTS_SERVICE=azure` 설정

**사용 가능한 음성:**
- `ko-KR-InJoonNeural` (남성)
- `ko-KR-SunHiNeural` (여성)
- `ko-KR-YuJinNeural` (여성)

### 4. CLOVA Voice (Naver Cloud Platform)
1. [Naver Cloud Platform](https://www.ncloud.com/) 접속
2. "AI·NAVER API" > "CLOVA Voice" 서비스 신청
3. "Application" 생성 후 Client ID와 Client Secret 확인
4. `.env.local`에 설정:
   - `CLOVA_CLIENT_ID`: Client ID
   - `CLOVA_CLIENT_SECRET`: Client Secret
5. `NEXT_PUBLIC_TTS_SERVICE=clova` 설정

**사용 가능한 음성:**
- `nara` (여성, 기본)
- `nkyungsu` (남성)
- `nhajun` (남성)
- `ndain` (여성)

## API 엔드포인트

### POST /api/tts/google
```json
{
  "text": "안녕하세요",
  "language": "ko-KR",
  "voice": "ko-KR-Standard-A",
  "speed": 1.0,
  "pitch": 0
}
```

### POST /api/tts/azure
```json
{
  "text": "안녕하세요",
  "language": "ko-KR",
  "voice": "ko-KR-InJoonNeural",
  "speed": 1.0,
  "pitch": 0
}
```

### POST /api/tts/clova
```json
{
  "text": "안녕하세요",
  "voice": "nara",
  "speed": 0,
  "pitch": 0,
  "volume": 0
}
```

## 사용 방법

프론트엔드에서 자동으로 설정된 TTS 서비스를 사용합니다:

```typescript
import { speakText } from '@/lib/utils/tts';

// 환경변수에 설정된 서비스 사용
await speakText('안녕하세요', {
  language: 'ko-KR',
  speed: 1.0,
  pitch: 1.0,
});
```

## 문제 해결

### TTS가 작동하지 않는 경우
1. 환경 변수가 올바르게 설정되었는지 확인
2. API 키가 유효한지 확인
3. 브라우저 콘솔에서 에러 메시지 확인
4. Web Speech API로 fallback되는지 확인

### API 호출 실패 시
- 자동으로 Web Speech API로 fallback됩니다
- 콘솔에 에러 메시지가 표시됩니다

