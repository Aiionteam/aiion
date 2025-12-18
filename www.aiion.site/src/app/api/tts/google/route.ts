import { NextRequest, NextResponse } from 'next/server';

/**
 * Google Cloud TTS API 엔드포인트
 * POST /api/tts/google
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, language = 'ko-KR', voice = 'ko-KR-Standard-A', speed = 1.0, pitch = 0 } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'text is required' },
        { status: 400 }
      );
    }

    // Google Cloud TTS API 키 확인
    const apiKey = process.env.GOOGLE_TTS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google TTS API key is not configured' },
        { status: 500 }
      );
    }

    // Google Cloud TTS API 호출
    const ttsUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
    
    const response = await fetch(ttsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode: language,
          name: voice,
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: speed,
          pitch: pitch,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Google TTS API error:', errorData);
      return NextResponse.json(
        { error: 'Google TTS API 호출 실패', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Base64 인코딩된 오디오를 디코딩
    const audioBuffer = Buffer.from(data.audioContent, 'base64');

    // 오디오 blob 반환
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Google TTS error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

