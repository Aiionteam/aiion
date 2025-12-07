/**
 * 타이타닉 API 함수들
 * 백엔드 게이트웨이 서버 (localhost:8080)와 연동
 */

import apiClient from "./client";

export interface Passenger {
  PassengerId: string;
  Survived: string;
  Pclass: string;
  Name: string;
  Sex: string;
  Age: string;
  SibSp: string;
  Parch: string;
  Ticket: string;
  Fare: string;
  Cabin: string;
  Embarked: string;
}

export interface Top10PassengersResponse {
  count: number;
  passengers: Passenger[];
}

/**
 * 상위 10명의 타이타닉 승객 정보 조회
 */
export async function getTop10Passengers(): Promise<Top10PassengersResponse> {
  try {
    const response = await apiClient.get<Top10PassengersResponse>(
      "/titanic/passengers/top10"
    );
    return response.data;
  } catch (error: any) {
    console.error("[Titanic API] 상위 10명 승객 조회 실패:", error);
    throw error;
  }
}

