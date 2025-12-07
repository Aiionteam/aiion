import { NextRequest, NextResponse } from 'next/server';

/**
 * CLOVA Voice TTS API 엔드포인트
 * POST /api/tts/clova
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voice = 'nara', speed = 0, pitch = 0, volume = 0 } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'text is required' },
        { status: 400 }
      );
    }

    // CLOVA Voice 설정 확인
    const clientId = process.env.CLOVA_CLIENT_ID;
    const clientSecret = process.env.CLOVA_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'CLOVA Voice credentials are not configured' },
        { status: 500 }
      );
    }

    // CLOVA Voice API 호출
    const ttsUrl = 'https://naveropenapi.apigw.ntruss.com/tts-premium/v1/tts';
    
    const response = await fetch(ttsUrl, {
      method: 'POST',
      headers: {
        'X-NCP-APIGW-API-KEY-ID': clientId,
        'X-NCP-APIGW-API-KEY': clientSecret,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        speaker: voice,
        text: text,
        speed: speed.toString(),
        pitch: pitch.toString(),
        volume: volume.toString(),
        format: 'mp3',
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('CLOVA TTS API error:', errorData);
      return NextResponse.json(
        { error: 'CLOVA TTS API 호출 실패', details: errorData },
        { status: response.status }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    // 오디오 blob 반환
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('CLOVA TTS error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

