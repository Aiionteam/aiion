import { NextRequest, NextResponse } from 'next/server';

/**
 * Azure Speech Service TTS API 엔드포인트
 * POST /api/tts/azure
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, language = 'ko-KR', voice = 'ko-KR-InJoonNeural', speed = 1.0, pitch = 0 } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'text is required' },
        { status: 400 }
      );
    }

    // Azure Speech Service 설정 확인
    const subscriptionKey = process.env.AZURE_SPEECH_KEY;
    const region = process.env.AZURE_SPEECH_REGION || 'koreacentral';

    if (!subscriptionKey) {
      return NextResponse.json(
        { error: 'Azure Speech Service key is not configured' },
        { status: 500 }
      );
    }

    // SSML 생성
    const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${language}">
        <voice name="${voice}">
          <prosody rate="${speed}" pitch="${pitch > 0 ? `+${pitch}Hz` : `${pitch}Hz`}">
            ${text}
          </prosody>
        </voice>
      </speak>
    `.trim();

    // Azure Speech Service API 호출
    const tokenUrl = `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`;
    
    // Access Token 획득
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': subscriptionKey,
      },
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Azure Token error:', errorData);
      return NextResponse.json(
        { error: 'Azure Speech Service 토큰 획득 실패', details: errorData },
        { status: tokenResponse.status }
      );
    }

    const accessToken = await tokenResponse.text();

    // TTS API 호출
    const ttsUrl = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
    
    const ttsResponse = await fetch(ttsUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
      },
      body: ssml,
    });

    if (!ttsResponse.ok) {
      const errorData = await ttsResponse.text();
      console.error('Azure TTS API error:', errorData);
      return NextResponse.json(
        { error: 'Azure TTS API 호출 실패', details: errorData },
        { status: ttsResponse.status }
      );
    }

    const audioBuffer = await ttsResponse.arrayBuffer();

    // 오디오 blob 반환
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('Azure TTS error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

