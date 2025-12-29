/**
 * Stable Diffusion API 클라이언트
 * FastAPI 백엔드 (포트 8001)와 통신
 */

const DIFFUSION_API_BASE_URL =
  process.env.NEXT_PUBLIC_DIFFUSION_API_URL || "http://localhost:8001";

interface GenerateRequest {
  prompt: string;
  negative_prompt?: string | null;
  width?: number | null;
  height?: number | null;
  steps?: number | null;
  guidance_scale?: number | null;
  seed?: number | null;
}

interface GenerateResponse {
  id: string;
  image_url: string;
  meta_url: string;
  meta: {
    model_id: string | null;
    prompt: string;
    negative_prompt: string | null;
    width: number;
    height: number;
    steps: number;
    guidance_scale: number;
    seed: number | null;
    device: string;
    strength?: number; // img2img 전용
  };
}

interface Img2ImgRequest {
  prompt: string;
  negative_prompt?: string | null;
  strength?: number;
  width?: number | null;
  height?: number | null;
  steps?: number | null;
  guidance_scale?: number | null;
  seed?: number | null;
  image: File; // 이미지 파일
}

class DiffusionApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = DIFFUSION_API_BASE_URL;
    
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      console.log(`[Diffusion API] Base URL: ${this.baseURL}`);
    }
  }

  /**
   * 텍스트로부터 이미지 생성
   */
  async generateImage(request: GenerateRequest): Promise<GenerateResponse> {
    const url = `${this.baseURL}/api/v1/generate`;
    
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: request.prompt,
          negative_prompt: request.negative_prompt || null,
          width: request.width || null,
          height: request.height || null,
          steps: request.steps || null,
          guidance_scale: request.guidance_scale || null,
          seed: request.seed === -1 || request.seed === null ? null : request.seed,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `이미지 생성 실패 (${response.status})`;
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.detail || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const data: GenerateResponse = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("이미지 생성 중 오류가 발생했습니다.");
    }
  }

  /**
   * 이미지 투 이미지 생성
   */
  async generateImg2Img(request: Img2ImgRequest): Promise<GenerateResponse> {
    const url = `${this.baseURL}/api/v1/img2img`;
    
    try {
      const formData = new FormData();
      formData.append("image", request.image);
      formData.append("prompt", request.prompt);
      if (request.negative_prompt) {
        formData.append("negative_prompt", request.negative_prompt);
      }
      if (request.strength !== undefined) {
        formData.append("strength", request.strength.toString());
      }
      if (request.width !== null && request.width !== undefined) {
        formData.append("width", request.width.toString());
      }
      if (request.height !== null && request.height !== undefined) {
        formData.append("height", request.height.toString());
      }
      if (request.steps !== null && request.steps !== undefined) {
        formData.append("steps", request.steps.toString());
      }
      if (request.guidance_scale !== null && request.guidance_scale !== undefined) {
        formData.append("guidance_scale", request.guidance_scale.toString());
      }
      if (request.seed !== null && request.seed !== undefined && request.seed !== -1) {
        formData.append("seed", request.seed.toString());
      }

      const response = await fetch(url, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `이미지 생성 실패 (${response.status})`;
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.detail || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const data: GenerateResponse = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("이미지 생성 중 오류가 발생했습니다.");
    }
  }

  /**
   * 이미지 URL을 완전한 URL로 변환
   */
  getImageUrl(imageUrl: string): string {
    // 이미 완전한 URL이면 그대로 반환
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return imageUrl;
    }
    // 상대 경로면 base URL과 결합
    return `${this.baseURL}${imageUrl}`;
  }
}

export const diffusionApiClient = new DiffusionApiClient();
export type { GenerateRequest, GenerateResponse, Img2ImgRequest };

