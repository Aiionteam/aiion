from pydantic import BaseModel, Field

class GenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    negative_prompt: str | None = None

    width: int | None = None
    height: int | None = None
    steps: int | None = None
    guidance_scale: float | None = None
    seed: int | None = None
    use_refiner: bool | None = None  # Refiner 사용 여부 (None이면 설정값 사용)
    refiner_strength: float | None = Field(None, ge=0.0, le=1.0)  # Refiner strength (0.25~0.3 권장)

class Img2ImgRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    negative_prompt: str | None = None
    strength: float = Field(0.75, ge=0.0, le=1.0)  # 노이즈 제거 강도
    
    width: int | None = None
    height: int | None = None
    steps: int | None = None
    guidance_scale: float | None = None
    seed: int | None = None

class GenerateResponse(BaseModel):
    id: str
    image_url: str
    meta_url: str
    meta: dict