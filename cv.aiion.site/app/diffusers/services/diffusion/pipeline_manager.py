import torch
from diffusers import (
    AutoPipelineForText2Image,
    StableDiffusionXLPipeline,
    StableDiffusionXLImg2ImgPipeline,
    UNet2DConditionModel,
    AutoencoderKL,
    DPMSolverMultistepScheduler,
    EulerDiscreteScheduler,
)
from transformers import CLIPTextModel, CLIPTextModelWithProjection, CLIPTokenizer
from safetensors import safe_open
from app.diffusers.core.config import MODEL_ID, DEVICE, DTYPE, HF_CACHE_DIR, SCHEDULER_TYPE, USE_KARRAS, USE_REFINER, DEFAULT_REFINER_STRENGTH

_PIPELINE = None
_PIPELINE_LOADED = False  # 파이프라인 로드 여부 추적
_REFINER_PIPELINE = None
_REFINER_LOADED = False  # Refiner 파이프라인 로드 여부 추적

def _torch_dtype():
    """설정에 따른 torch dtype 반환"""
    if DTYPE.lower() == "float16":
        return torch.float16
    if DTYPE.lower() == "bfloat16":
        return torch.bfloat16
    return torch.float32

def _load_from_single_files(model_dir):
    """
    단일 safetensors 파일에서 SDXL 파이프라인 로드
    - sd_xl_base_1.0.safetensors: UNet
    - sdxl.vae.safetensors: VAE
    - text_encoder, text_encoder_2: Hugging Face에서 로드
    """
    from pathlib import Path
    model_path = Path(model_dir)
    dtype = _torch_dtype()
    
    print("📦 단일 safetensors 파일 형식으로 로드 중...")
    
    # 1. Text Encoders (Hugging Face에서 로드)
    print("  [1/4] Text Encoders 로드 중...")
    text_encoder = CLIPTextModel.from_pretrained(
        "stabilityai/stable-diffusion-xl-base-1.0",
        subfolder="text_encoder",
        dtype=dtype,  # torch_dtype 대신 dtype 사용
        cache_dir=str(HF_CACHE_DIR),
    )
    text_encoder_2 = CLIPTextModelWithProjection.from_pretrained(
        "stabilityai/stable-diffusion-xl-base-1.0",
        subfolder="text_encoder_2",
        dtype=dtype,  # torch_dtype 대신 dtype 사용
        cache_dir=str(HF_CACHE_DIR),
    )
    tokenizer = CLIPTokenizer.from_pretrained(
        "stabilityai/stable-diffusion-xl-base-1.0",
        subfolder="tokenizer",
        cache_dir=str(HF_CACHE_DIR),
    )
    tokenizer_2 = CLIPTokenizer.from_pretrained(
        "stabilityai/stable-diffusion-xl-base-1.0",
        subfolder="tokenizer_2",
        cache_dir=str(HF_CACHE_DIR),
    )
    print("  ✅ Text Encoders 로드 완료")
    
    # 2. UNet (로컬 safetensors 파일에서 로드)
    print("  [2/4] UNet 로드 중...")
    unet_path = model_path / "sd_xl_base_1.0.safetensors"
    if not unet_path.exists():
        raise FileNotFoundError(f"UNet 파일을 찾을 수 없습니다: {unet_path}")
    
    # UNet config는 Hugging Face에서 가져오기
    unet = UNet2DConditionModel.from_pretrained(
        "stabilityai/stable-diffusion-xl-base-1.0",
        subfolder="unet",
        dtype=dtype,  # torch_dtype 대신 dtype 사용
        cache_dir=str(HF_CACHE_DIR),
    )
    
    # 로컬 safetensors 파일에서 가중치 로드
    # sd_xl_base_1.0.safetensors는 전체 파이프라인 가중치를 포함할 수 있음
    # UNet 모델의 키 구조 확인
    unet_model_keys = set(unet.state_dict().keys())
    
    # 로컬 파일에서 모든 키 로드
    file_state_dict = {}
    with safe_open(str(unet_path), framework="pt", device="cpu") as f:
        for key in f.keys():
            file_state_dict[key] = f.get_tensor(key)
    
    # UNet 모델 키와 매칭
    unet_state_dict = {}
    matched_count = 0
    
    # 1. 직접 매칭 시도
    for model_key in unet_model_keys:
        if model_key in file_state_dict:
            unet_state_dict[model_key] = file_state_dict[model_key]
            matched_count += 1
        # 2. ComfyUI 형식 변환 시도 (model.diffusion_model. -> )
        elif f"model.diffusion_model.{model_key}" in file_state_dict:
            unet_state_dict[model_key] = file_state_dict[f"model.diffusion_model.{model_key}"]
            matched_count += 1
        # 3. diffusion_model. 접두사 제거 시도
        elif f"diffusion_model.{model_key}" in file_state_dict:
            unet_state_dict[model_key] = file_state_dict[f"diffusion_model.{model_key}"]
            matched_count += 1
    
    print(f"  📊 키 매칭: {matched_count}/{len(unet_model_keys)}개")
    
    # 로드된 키 확인
    missing_keys, unexpected_keys = unet.load_state_dict(unet_state_dict, strict=False)
    if len(missing_keys) > 100:  # 너무 많으면 일부만 출력
        print(f"  ⚠️  UNet 누락된 키: {len(missing_keys)}개 (일부는 정상일 수 있음)")
        print(f"      샘플: {list(missing_keys)[:5]}")
    elif missing_keys:
        print(f"  ⚠️  UNet 누락된 키: {len(missing_keys)}개")
    if unexpected_keys:
        print(f"  ⚠️  UNet 예상치 못한 키: {len(unexpected_keys)}개")
    print(f"  ✅ UNet 로드 완료")
    
    # 3. VAE (로컬 safetensors 파일에서 로드)
    print("  [3/4] VAE 로드 중...")
    vae_path = model_path / "sdxl.vae.safetensors"
    if not vae_path.exists():
        raise FileNotFoundError(f"VAE 파일을 찾을 수 없습니다: {vae_path}")
    
    # VAE config는 로컬 config.json 사용 (있으면)
    vae_config_path = model_path / "config.json"
    if vae_config_path.exists():
        # 로컬 config 사용
        import json
        vae_config = json.loads(vae_config_path.read_text())
        # _class_name, _diffusers_version 등 제거
        vae_config_clean = {k: v for k, v in vae_config.items() if not k.startswith('_')}
        vae = AutoencoderKL(**vae_config_clean)
    else:
        # Hugging Face에서 config 가져오기
        vae = AutoencoderKL.from_pretrained(
            "stabilityai/stable-diffusion-xl-base-1.0",
            subfolder="vae",
            dtype=dtype,  # torch_dtype 대신 dtype 사용
            cache_dir=str(HF_CACHE_DIR),
        )
    
    # 로컬 safetensors 파일에서 가중치 로드
    # VAE 모델의 키 구조 확인
    vae_model_keys = set(vae.state_dict().keys())
    
    # 로컬 파일에서 모든 키 로드
    file_state_dict = {}
    with safe_open(str(vae_path), framework="pt", device="cpu") as f:
        for key in f.keys():
            file_state_dict[key] = f.get_tensor(key)
    
    # VAE 모델 키와 매칭
    vae_state_dict = {}
    matched_count = 0
    
    # 1. 직접 매칭 시도
    for model_key in vae_model_keys:
        if model_key in file_state_dict:
            vae_state_dict[model_key] = file_state_dict[model_key]
            matched_count += 1
        # 2. first_stage_model. 접두사 제거 시도
        elif f"first_stage_model.{model_key}" in file_state_dict:
            vae_state_dict[model_key] = file_state_dict[f"first_stage_model.{model_key}"]
            matched_count += 1
        # 3. model. 접두사 제거 시도
        elif f"model.{model_key}" in file_state_dict:
            vae_state_dict[model_key] = file_state_dict[f"model.{model_key}"]
            matched_count += 1
    
    print(f"  📊 키 매칭: {matched_count}/{len(vae_model_keys)}개")
    
    # 로드된 키 확인
    missing_keys, unexpected_keys = vae.load_state_dict(vae_state_dict, strict=False)
    if len(missing_keys) > 50:  # 너무 많으면 일부만 출력
        print(f"  ⚠️  VAE 누락된 키: {len(missing_keys)}개 (일부는 정상일 수 있음)")
        print(f"      샘플: {list(missing_keys)[:5]}")
    elif missing_keys:
        print(f"  ⚠️  VAE 누락된 키: {len(missing_keys)}개")
    if unexpected_keys:
        print(f"  ⚠️  VAE 예상치 못한 키: {len(unexpected_keys)}개")
    # VAE dtype 설정 (경고 방지)
    # VAE는 디코딩 시 float32가 필요할 수 있으므로 명시적으로 설정
    vae = vae.to(dtype=dtype)
    # upcast_vae deprecation 경고 방지를 위해 명시적으로 처리
    if hasattr(vae, 'enable_slicing'):
        vae.enable_slicing()
    if hasattr(vae, 'enable_tiling'):
        vae.enable_tiling()
    print(f"  ✅ VAE 로드 완료")
    
    # 4. Scheduler (Hugging Face에서 로드)
    print("  [4/4] Scheduler 로드 중...")
    if SCHEDULER_TYPE == "dpm++" and USE_KARRAS:
        # DPM++ 2M Karras (고품질 조합)
        scheduler = DPMSolverMultistepScheduler.from_pretrained(
            "stabilityai/stable-diffusion-xl-base-1.0",
            subfolder="scheduler",
            cache_dir=str(HF_CACHE_DIR),
        )
        # Karras 시그마 스케줄 적용
        scheduler = DPMSolverMultistepScheduler.from_config(
            scheduler.config,
            use_karras=True,
        )
        print("  ✅ DPM++ Multistep Scheduler (Karras) 로드 완료")
    else:
        # Euler (기본)
        scheduler = EulerDiscreteScheduler.from_pretrained(
            "stabilityai/stable-diffusion-xl-base-1.0",
            subfolder="scheduler",
            cache_dir=str(HF_CACHE_DIR),
        )
        print("  ✅ Euler Discrete Scheduler 로드 완료")
    
    # 파이프라인 구성
    print("🔧 파이프라인 구성 중...")
    pipe = StableDiffusionXLPipeline(
        vae=vae,
        text_encoder=text_encoder,
        text_encoder_2=text_encoder_2,
        tokenizer=tokenizer,
        tokenizer_2=tokenizer_2,
        unet=unet,
        scheduler=scheduler,
    )
    
    return pipe

def get_pipeline():
    """
    SDXL 파이프라인 싱글톤 로드 및 최적화
    RTX 4060 8GB 환경에 최적화됨
    단일 safetensors 파일 형식 지원
    """
    global _PIPELINE
    if _PIPELINE is not None:
        return _PIPELINE

    print(f"🔄 모델 로딩 중: {MODEL_ID}")
    dtype = _torch_dtype()

    # 로컬 모델인지 Hugging Face 모델인지 확인
    from pathlib import Path
    model_path = Path(MODEL_ID)
    is_local = model_path.exists() and (model_path / "model_index.json").exists()
    
    if is_local:
        print(f"📁 로컬 모델 경로 사용: {MODEL_ID}")
        
        # 표준 diffusers 형식 확인 (우선)
        has_text_encoder = (model_path / "text_encoder").exists()
        has_unet = (model_path / "unet").exists()
        has_vae = (model_path / "vae").exists()
        
        # 단일 safetensors 파일 형식 확인 (대체)
        has_unet_file = (model_path / "sd_xl_base_1.0.safetensors").exists()
        has_vae_file = (model_path / "sdxl.vae.safetensors").exists()
        
        if has_text_encoder and has_unet and has_vae:
            # 표준 diffusers 형식으로 로드 (완전 로컬)
            print("  📦 표준 diffusers 형식으로 로드 (완전 로컬)")
            try:
                # VAE: sdxl.vae.safetensors 우선 사용 (색감 보존)
                # 단일 파일 형식의 VAE가 있으면 우선 사용
                vae_single_file = model_path / "sdxl.vae.safetensors"
                if vae_single_file.exists():
                    print("  🎨 sdxl.vae.safetensors 사용 (색감 보존)")
                    # VAE를 단일 파일에서 로드
                    from diffusers import AutoencoderKL
                    vae = AutoencoderKL.from_pretrained(
                        MODEL_ID,
                        subfolder="vae",
                        torch_dtype=dtype,
                        local_files_only=True,
                    )
                    # sdxl.vae.safetensors에서 가중치 로드
                    from safetensors import safe_open
                    vae_state_dict = {}
                    with safe_open(str(vae_single_file), framework="pt", device="cpu") as f:
                        for key in f.keys():
                            if key.startswith("first_stage_model."):
                                vae_state_dict[key.replace("first_stage_model.", "")] = f.get_tensor(key)
                            elif key.startswith("vae."):
                                vae_state_dict[key[4:]] = f.get_tensor(key)
                            elif key.startswith("model."):
                                vae_state_dict[key[6:]] = f.get_tensor(key)
                            else:
                                vae_state_dict[key] = f.get_tensor(key)
                    vae.load_state_dict(vae_state_dict, strict=False)
                    vae = vae.to(dtype=dtype)
                    
                    # 나머지 컴포넌트는 표준 형식으로 로드
                    pipe = AutoPipelineForText2Image.from_pretrained(
                        MODEL_ID,
                        torch_dtype=dtype,
                        variant=None,
                        use_safetensors=True,
                        local_files_only=True,
                    )
                    # VAE 교체
                    pipe.vae = vae
                else:
                    # 표준 형식 VAE 사용
                    pipe = AutoPipelineForText2Image.from_pretrained(
                        MODEL_ID,
                        torch_dtype=dtype,  # dtype 변수 사용 (float16으로 메모리 절약)
                        variant=None,
                        use_safetensors=True,
                        local_files_only=True,  # 로컬 파일만 사용
                    )
                
                # torch_dtype으로 이미 로드되었으므로 추가 변환 불필요
                # (from_pretrained의 torch_dtype 파라미터가 이미 모든 컴포넌트에 적용됨)
                
                # Karras 스케줄러 적용 (표준 형식)
                if SCHEDULER_TYPE == "dpm++" and USE_KARRAS:
                    print("  🔥 Karras 스케줄러 적용 중...")
                    pipe.scheduler = DPMSolverMultistepScheduler.from_config(
                        pipe.scheduler.config,
                        use_karras=True,
                    )
                    print("  ✅ DPM++ Multistep Scheduler (Karras) 적용 완료")
            except Exception as e:
                print(f"  ❌ 표준 형식 로드 실패: {e}")
                print("  💡 download_model_local.py를 실행하여 모든 컴포넌트를 다운로드하세요.")
                raise
        elif has_unet_file and has_vae_file:
            # 단일 safetensors 파일 형식으로 로드 (Text Encoders는 Hugging Face에서)
            print("  📦 단일 safetensors 파일 형식으로 로드 (Text Encoders는 Hugging Face에서)")
            try:
                pipe = _load_from_single_files(model_path)
            except Exception as e:
                print(f"  ❌ 단일 파일 형식 로드 실패: {e}")
                import traceback
                traceback.print_exc()
                raise
        else:
            raise ValueError(
                "로컬 모델 구조를 찾을 수 없습니다.\n"
                "다음 중 하나의 형식이 필요합니다:\n"
                "  1. 표준 diffusers 형식: text_encoder/, unet/, vae/ 폴더\n"
                "  2. 단일 파일 형식: sd_xl_base_1.0.safetensors, sdxl.vae.safetensors\n"
                "download_model_local.py를 실행하여 표준 형식으로 다운로드하세요."
            )
    else:
        print(f"🌐 Hugging Face 모델 다운로드: {MODEL_ID}")
        # Hugging Face 모델 로드
        # from_pretrained는 torch_dtype만 받지만, dtype 변수를 사용하여 명확하게 표시
        pipe = AutoPipelineForText2Image.from_pretrained(
            MODEL_ID,
            torch_dtype=dtype,  # dtype 변수 사용 (float16으로 메모리 절약)
            cache_dir=str(HF_CACHE_DIR),
            variant="fp16" if dtype in (torch.float16, torch.bfloat16) else None,
            use_safetensors=True,
        )
        
        # torch_dtype으로 이미 로드되었으므로 추가 변환 불필요
        # (from_pretrained의 torch_dtype 파라미터가 이미 모든 컴포넌트에 적용됨)
        
        # Karras 스케줄러 적용 (Hugging Face 모델)
        if SCHEDULER_TYPE == "dpm++" and USE_KARRAS:
            print("  🔥 Karras 스케줄러 적용 중...")
            pipe.scheduler = DPMSolverMultistepScheduler.from_config(
                pipe.scheduler.config,
                use_karras=True,
            )
            print("  ✅ DPM++ Multistep Scheduler (Karras) 적용 완료")

    # ✅ RTX 4060 8GB 최적화 옵션
    
    # 1. xFormers 메모리 효율적 어텐션 (가장 중요!)
    try:
        pipe.enable_xformers_memory_efficient_attention()
        print("✅ xFormers 메모리 최적화 활성화")
    except Exception as e:
        print(f"⚠️  xFormers 활성화 실패: {e}")
        # xFormers 실패 시 attention slicing 사용
        try:
            pipe.enable_attention_slicing(slice_size="auto")
            print("✅ Attention Slicing 활성화 (xFormers 대체)")
        except Exception:
            pass

    # 2. VAE Tiling (고해상도/메모리 부족 시 안정성) - 필수!
    try:
        pipe.enable_vae_tiling()
        print("✅ VAE Tiling 활성화 (메모리 절약)")
    except Exception as e:
        print(f"⚠️  VAE Tiling 활성화 실패: {e}")
    
    # 3. VAE Slicing (추가 메모리 절약)
    try:
        pipe.enable_vae_slicing()
        print("✅ VAE Slicing 활성화 (추가 메모리 절약)")
    except Exception as e:
        print(f"⚠️  VAE Slicing 활성화 실패: {e}")

    # 디바이스 이동
    if DEVICE == "cuda" and torch.cuda.is_available():
        pipe = pipe.to("cuda")
        print(f"✅ CUDA 디바이스로 이동: {torch.cuda.get_device_name(0)}")
        print(f"💾 사용 가능 VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f}GB")
    else:
        pipe = pipe.to("cpu")
        print("⚠️  CPU 모드로 실행 (느림)")

    _PIPELINE = pipe
    _PIPELINE_LOADED = True # 파이프라인 로드 완료
    print("✅ 파이프라인 준비 완료")
    return _PIPELINE

def get_refiner_pipeline():
    """
    SDXL Refiner 파이프라인 로드 (메모리 효율적)
    필요할 때만 로드하고, CPU offload 사용
    """
    global _REFINER_PIPELINE, _REFINER_LOADED
    
    if _REFINER_PIPELINE is not None and _REFINER_LOADED:
        return _REFINER_PIPELINE
    
    if not USE_REFINER:
        return None
    
    print("🔄 Refiner 파이프라인 로딩 중...")
    dtype = _torch_dtype()
    
    from pathlib import Path
    model_path = Path(MODEL_ID)
    is_local = model_path.exists() and (model_path / "model_index.json").exists()
    
    # Refiner 모델 경로 확인
    refiner_model_id = "stabilityai/stable-diffusion-xl-refiner-1.0"
    if is_local:
        # 로컬 refiner 파일 확인
        refiner_file = model_path / "sd_xl_refiner_1.0.safetensors"
        if refiner_file.exists():
            print("  📁 로컬 Refiner 파일 감지 (단일 파일 형식은 아직 미지원)")
            # 로컬 refiner는 단일 파일 형식이므로 별도 처리 필요
            # 일단 Hugging Face refiner 사용 (로컬 refiner는 복잡함)
            refiner_model_id = "stabilityai/stable-diffusion-xl-refiner-1.0"
        else:
            print("  ⚠️  로컬 Refiner 파일을 찾을 수 없습니다. Hugging Face 모델 사용")
    
    # Refiner 파이프라인 로드 (Img2Img 파이프라인 사용)
    try:
        refiner = StableDiffusionXLImg2ImgPipeline.from_pretrained(
            refiner_model_id,
            torch_dtype=dtype,
            variant="fp16" if dtype in (torch.float16, torch.bfloat16) else None,
            use_safetensors=True,
            cache_dir=str(HF_CACHE_DIR),
        )
        
        # Karras 스케줄러 적용
        if SCHEDULER_TYPE == "dpm++" and USE_KARRAS:
            print("  🔥 Refiner에 Karras 스케줄러 적용 중...")
            refiner.scheduler = DPMSolverMultistepScheduler.from_config(
                refiner.scheduler.config,
                use_karras=True,
            )
            print("  ✅ Refiner DPM++ Multistep Scheduler (Karras) 적용 완료")
        
        # 메모리 최적화 옵션
        try:
            refiner.enable_xformers_memory_efficient_attention()
            print("✅ Refiner: xFormers 메모리 최적화 활성화")
        except Exception:
            refiner.enable_attention_slicing(slice_size="auto")
            print("✅ Refiner: Attention Slicing 활성화")
        
        refiner.enable_vae_tiling()
        refiner.enable_vae_slicing()
        
        # CPU offload로 메모리 절약 (8GB VRAM 최적화)
        refiner.enable_model_cpu_offload()
        print("✅ Refiner: CPU Offload 활성화 (메모리 절약)")
        
        _REFINER_PIPELINE = refiner
        _REFINER_LOADED = True
        print("✅ Refiner 파이프라인 준비 완료")
        return _REFINER_PIPELINE
        
    except Exception as e:
        print(f"❌ Refiner 파이프라인 로드 실패: {e}")
        print("  ⚠️  Refiner 없이 계속 진행합니다.")
        return None
