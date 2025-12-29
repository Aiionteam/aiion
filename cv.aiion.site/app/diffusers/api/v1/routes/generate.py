from fastapi import APIRouter, UploadFile, File, Form
from app.diffusers.api.v1.schemas.generate import GenerateRequest, GenerateResponse
from app.diffusers.core.limits import get_semaphore
from app.diffusers.services.diffusion.txt2img import generate_txt2img
from app.diffusers.services.diffusion.img2img import generate_img2img
from app.diffusers.storage.filesystem import save_image_and_meta
from app.diffusers.core.config import (
    DEFAULT_WIDTH, DEFAULT_HEIGHT, DEFAULT_STEPS, DEFAULT_GUIDANCE
)
from PIL import Image
import io

# 동시성 제한(세마포어) 걸고 생성 후 저장합니다.

router = APIRouter()

@router.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest):
    """
    텍스트로부터 이미지 생성 (txt2img)
    동시성 제한(세마포어)을 적용하여 OOM 방지
    """
    sem = get_semaphore()
    async with sem:
        image, meta = generate_txt2img(
            prompt=req.prompt,
            negative_prompt=req.negative_prompt,
            width=req.width or DEFAULT_WIDTH,
            height=req.height or DEFAULT_HEIGHT,
            steps=req.steps or DEFAULT_STEPS,
            guidance_scale=req.guidance_scale if req.guidance_scale is not None else DEFAULT_GUIDANCE,
            seed=req.seed,
            use_refiner=req.use_refiner,
            refiner_strength=req.refiner_strength,
        )
        saved = save_image_and_meta(image, meta)
        return saved

@router.post("/img2img", response_model=GenerateResponse)
async def generate_img2img_endpoint(
    image: UploadFile = File(...),
    prompt: str = Form(...),
    negative_prompt: str | None = Form(None),
    strength: float = Form(0.75),
    width: int | None = Form(None),
    height: int | None = Form(None),
    steps: int | None = Form(None),
    guidance_scale: float | None = Form(None),
    seed: int | None = Form(None),
    use_refiner: bool | None = Form(None),
    refiner_strength: float | None = Form(None),
):
    """
    이미지 투 이미지 생성 (img2img)
    동시성 제한(세마포어)을 적용하여 OOM 방지
    """
    sem = get_semaphore()
    async with sem:
        # 업로드된 이미지 읽기
        image_data = await image.read()
        input_image = Image.open(io.BytesIO(image_data)).convert("RGB")
        
        # 이미지 투 이미지 생성
        output_image, meta = generate_img2img(
            prompt=prompt,
            image=input_image,
            negative_prompt=negative_prompt,
            strength=strength,
            width=width,
            height=height,
            steps=steps,
            guidance_scale=guidance_scale,
            seed=seed,
            use_refiner=use_refiner,
            refiner_strength=refiner_strength,
        )
        
        saved = save_image_and_meta(output_image, meta)
        return saved
