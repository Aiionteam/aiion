/**
 * 사용자 API 호출 훅
 */

import { fetchFromGateway, parseJSONResponse } from '../../lib/api/client';

export interface UserModel {
  id?: number;
  name: string;
  email: string;
  nickname?: string;
  provider?: string;
  providerId?: string;
}

export interface Messenger {
  Code?: number;
  code?: number;
  message: string;
  data?: any;
}

/**
 * 사용자 ID로 조회
 */
export async function fetchUserById(userId: number): Promise<UserModel | null> {
  try {
    const response = await fetchFromGateway(
      `/user/users/findById`,
      {},
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8', // 한글 인코딩 명시
        },
        body: JSON.stringify({ id: userId }),
      }
    );

    // Content-Type 헤더 확인
    const contentType = response.headers.get('Content-Type') || '';
    console.log('[fetchUserById] 응답 Content-Type:', contentType);
    
    const result = await parseJSONResponse<Messenger>(response);
    
    if (result.error) {
      console.error('[fetchUserById] API 에러:', result.error);
      return null;
    }

    const messenger = result.data as Messenger;
    const responseCode = messenger.Code ?? messenger.code;
    
    if (responseCode === 200 && messenger.data) {
      const userData = messenger.data as UserModel;
      console.log('[fetchUserById] 사용자 데이터 (원본):', userData);
      
      // 닉네임을 명시적으로 String으로 변환
      if (userData.nickname !== undefined && userData.nickname !== null) {
        userData.nickname = String(userData.nickname);
      }
      if (userData.name !== undefined && userData.name !== null) {
        userData.name = String(userData.name);
      }
      if (userData.email !== undefined && userData.email !== null) {
        userData.email = String(userData.email);
      }
      
      console.log('[fetchUserById] 닉네임 (String 변환 후):', userData.nickname, '타입:', typeof userData.nickname);
      return userData;
    }

    console.error('[fetchUserById] 사용자 조회 실패:', messenger.message);
    return null;
  } catch (error) {
    console.error('[fetchUserById] 예외 발생:', error);
    return null;
  }
}

/**
 * 닉네임 업데이트
 */
export async function updateUserNickname(userId: number, nickname: string): Promise<UserModel | null> {
  try {
    // 먼저 사용자 정보 조회
    const currentUser = await fetchUserById(userId);
    if (!currentUser) {
      throw new Error('사용자 정보를 조회할 수 없습니다.');
    }

    // 닉네임 업데이트 요청
    const requestBody = {
      id: userId,
      name: currentUser.name,
      email: currentUser.email,
      nickname: nickname,
      provider: currentUser.provider,
      providerId: currentUser.providerId,
    };
    
    const requestBodyJson = JSON.stringify(requestBody);
    console.log('[updateUserNickname] 요청 본문 (JSON):', requestBodyJson);
    console.log('[updateUserNickname] 닉네임 (원본):', nickname);
    console.log('[updateUserNickname] 닉네임 (UTF-8 바이트):', new TextEncoder().encode(nickname));
    
    const response = await fetchFromGateway(
      `/user/users`,
      {},
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8', // 한글 인코딩 명시
        },
        body: requestBodyJson,
      }
    );

    // 응답 헤더 확인
    const responseContentType = response.headers.get('Content-Type') || '';
    console.log('[updateUserNickname] 응답 Content-Type:', responseContentType);
    
    const result = await parseJSONResponse<Messenger>(response);
    
    if (result.error) {
      console.error('[updateUserNickname] API 에러:', result.error);
      throw new Error(result.error);
    }

    const messenger = result.data as Messenger;
    const responseCode = messenger.Code ?? messenger.code;
    
    if (responseCode === 200 && messenger.data) {
      const userData = messenger.data as UserModel;
      console.log('[updateUserNickname] 응답 데이터 (원본):', userData);
      
      // 모든 문자열 필드를 명시적으로 String으로 변환
      if (userData.nickname !== undefined && userData.nickname !== null) {
        userData.nickname = String(userData.nickname);
      }
      if (userData.name !== undefined && userData.name !== null) {
        userData.name = String(userData.name);
      }
      if (userData.email !== undefined && userData.email !== null) {
        userData.email = String(userData.email);
      }
      if (userData.provider !== undefined && userData.provider !== null) {
        userData.provider = String(userData.provider);
      }
      if (userData.providerId !== undefined && userData.providerId !== null) {
        userData.providerId = String(userData.providerId);
      }
      
      console.log('[updateUserNickname] 응답 닉네임 (String 변환 후):', userData.nickname, '타입:', typeof userData.nickname);
      console.log('[updateUserNickname] 응답 닉네임 (UTF-8 바이트):', userData.nickname ? new TextEncoder().encode(userData.nickname) : 'null');
      
      return userData;
    }

    throw new Error(messenger.message || '닉네임 업데이트에 실패했습니다.');
  } catch (error) {
    console.error('[updateUserNickname] 예외 발생:', error);
    throw error;
  }
}

