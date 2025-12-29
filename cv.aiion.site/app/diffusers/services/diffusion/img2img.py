import math
import torch
from PIL import Image
from app.diffusers.services.diffusion.pipeline_manager import get_pipeline, get_refiner_pipeline
from app.diffusers.core.config import (
    DEFAULT_WIDTH, DEFAULT_HEIGHT, DEFAULT_STEPS, DEFAULT_GUIDANCE,
    MAX_WIDTH, MAX_HEIGHT, MAX_STEPS, DEVICE, USE_REFINER, DEFAULT_REFINER_STRENGTH
)

def _clamp_int(v: int, lo: int, hi: int) -> int:
    """값을 최소/최대 범위로 제한"""
    return max(lo, min(hi, int(v)))

def _round_to_multiple(v: int, base: int = 8) -> int:
    """값을 base의 배수로 내림"""
    return int(math.floor(v / base) * base)

def generate_img2img(
    prompt: str,
    image: Image.Image,
    negative_prompt: str | None = None,
    strength: float = 0.75,
    width: int | None = None,
    height: int | None = None,
    steps: int | None = None,
    guidance_scale: float | None = None,
    seed: int | None = None,
    use_refiner: bool | None = None,
    refiner_strength: float | None = None,
):
    """
    이미지 투 이미지 생성
    
    Args:
        prompt: 생성할 이미지를 설명하는 텍스트
        image: 입력 이미지 (PIL Image)
        negative_prompt: 제외할 요소를 설명하는 텍스트
        strength: 노이즈 제거 강도 (0.0-1.0, 높을수록 프롬프트에 더 충실)
        width: 출력 이미지 너비 (None이면 입력 이미지 크기 사용)
        height: 출력 이미지 높이 (None이면 입력 이미지 크기 사용)
        steps: 샘플링 스텝 수
        guidance_scale: CFG Scale (창의성 조절)
        seed: 랜덤 시드 (재현성)
    
    Returns:
        (PIL.Image, dict): 생성된 이미지와 메타데이터
    """
    from diffusers import StableDiffusionXLImg2ImgPipeline
    
    # txt2img 파이프라인 가져오기
    txt2img_pipe = get_pipeline()
    
    # img2img 파이프라인 생성 (txt2img 파이프라인에서 컴포넌트 재사용)
    # 메모리 효율을 위해 컴포넌트를 재사용
    pipe = StableDiffusionXLImg2ImgPipeline(
        vae=txt2img_pipe.vae,
        text_encoder=txt2img_pipe.text_encoder,
        text_encoder_2=txt2img_pipe.text_encoder_2,
        tokenizer=txt2img_pipe.tokenizer,
        tokenizer_2=txt2img_pipe.tokenizer_2,
        unet=txt2img_pipe.unet,
        scheduler=txt2img_pipe.scheduler,
    )
    
    # 최적화 옵션 적용 (txt2img와 동일)
    try:
        pipe.enable_vae_tiling()
        pipe.enable_vae_slicing()
    except Exception:
        pass
    
    # 입력 이미지 크기
    input_width, input_height = image.size
    
    # 출력 크기 결정
    if width is None:
        width = input_width
    if height is None:
        height = input_height
    
    # 파라미터 보정 (OOM 방지)
    width = _round_to_multiple(_clamp_int(width, 64, MAX_WIDTH), 8)
    height = _round_to_multiple(_clamp_int(height, 64, MAX_HEIGHT), 8)
    steps = steps if steps is not None else DEFAULT_STEPS
    steps = _clamp_int(steps, 1, MAX_STEPS)
    guidance_scale = guidance_scale if guidance_scale is not None else DEFAULT_GUIDANCE
    
    # strength 범위 제한 (0.0-1.0)
    strength = max(0.0, min(1.0, float(strength)))
    
    # 입력 이미지 리사이즈 (출력 크기에 맞춤)
    if (input_width, input_height) != (width, height):
        image = image.resize((width, height), Image.Resampling.LANCZOS)
    
    # 시드 설정
    gen = None
    if seed is not None:
        device = "cuda" if (DEVICE == "cuda" and torch.cuda.is_available()) else "cpu"
        gen = torch.Generator(device=device).manual_seed(int(seed))
    
    # 이미지 투 이미지 생성
    result = pipe(
        prompt=prompt,
        negative_prompt=negative_prompt,
        image=image,
        strength=strength,
        width=width,
        height=height,
        num_inference_steps=steps,
        guidance_scale=float(guidance_scale),
        generator=gen,
    )
    
    output_image = result.images[0]
    
    # Refiner 적용 (옵션, 메모리 효율적)
    if (use_refiner if use_refiner is not None else USE_REFINER):
        refiner = get_refiner_pipeline()
        if refiner is not None:
            print("✨ Refiner 적용 중... (디테일 향상)")
            refiner_strength_val = refiner_strength if refiner_strength is not None else DEFAULT_REFINER_STRENGTH
            refiner_strength_val = max(0.0, min(1.0, float(refiner_strength_val)))  # 0.0~1.0 범위로 제한
            
            # Refiner로 이미지 개선
            refiner_gen = None
            if seed is not None:
                device = "cuda" if (DEVICE == "cuda" and torch.cuda.is_available()) else "cpu"
                refiner_gen = torch.Generator(device=device).manual_seed(int(seed) + 1)  # 시드 변경
            
            import warnings
            with warnings.catch_warnings():
                warnings.filterwarnings("ignore", category=FutureWarning, message=".*upcast_vae.*")
                
                refined_result = refiner(
                    prompt=prompt,
                    negative_prompt=negative_prompt,
                    image=output_image,
                    strength=refiner_strength_val,  # 0.25~0.3 권장 (디테일 살리면서 원본 유지)
                    num_inference_steps=max(1, int(steps * 0.5)),  # Refiner는 절반 스텝 사용
                    guidance_scale=float(guidance_scale),
                    generator=refiner_gen,
                    output_type="pil",
                )
            
            output_image = refined_result.images[0]
            print(f"✅ Refiner 적용 완료 (strength: {refiner_strength_val})")
            
            # Refiner 메모리 정리
            if DEVICE == "cuda" and torch.cuda.is_available():
                torch.cuda.empty_cache()
                import gc
                gc.collect()
    
    # 생성 후 VRAM 강제 정리 (메모리 누수 방지)
    if DEVICE == "cuda" and torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.synchronize()
        gc.collect()
    
    # 메타데이터 생성
    meta = {
        "model_id": getattr(pipe, "name_or_path", None),
        "prompt": prompt,
        "negative_prompt": negative_prompt,
        "width": width,
        "height": height,
        "steps": steps,
        "guidance_scale": float(guidance_scale),
        "strength": strength,
        "seed": seed,
        "device": "cuda" if (DEVICE == "cuda" and torch.cuda.is_available()) else "cpu",
        "refiner_used": (use_refiner if use_refiner is not None else USE_REFINER) and get_refiner_pipeline() is not None,
        "refiner_strength": refiner_strength if (use_refiner if use_refiner is not None else USE_REFINER) else None,
    }
    
    return output_image, meta

