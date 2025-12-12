"""
GPU 및 CUDA 사용 가능 여부 확인 스크립트
"""

import sys

try:
    import torch
    print("=" * 60)
    print("PyTorch 버전:", torch.__version__)
    print("=" * 60)
    
    # CUDA 사용 가능 여부
    cuda_available = torch.cuda.is_available()
    print(f"CUDA 사용 가능: {cuda_available}")
    
    if cuda_available:
        print(f"CUDA 버전: {torch.version.cuda}")
        print(f"cuDNN 버전: {torch.backends.cudnn.version()}")
        print(f"GPU 개수: {torch.cuda.device_count()}")
        
        for i in range(torch.cuda.device_count()):
            print(f"\nGPU {i}:")
            print(f"  이름: {torch.cuda.get_device_name(i)}")
            props = torch.cuda.get_device_properties(i)
            print(f"  총 메모리: {props.total_memory / 1024**3:.2f} GB")
            print(f"  컴퓨팅 능력: {props.major}.{props.minor}")
        
        # 현재 디바이스
        print(f"\n현재 디바이스: {torch.cuda.current_device()}")
        print(f"디바이스 이름: {torch.cuda.get_device_name(torch.cuda.current_device())}")
        
        # 간단한 GPU 테스트
        print("\n" + "=" * 60)
        print("GPU 테스트 실행 중...")
        try:
            x = torch.randn(1000, 1000).cuda()
            y = torch.randn(1000, 1000).cuda()
            z = torch.matmul(x, y)
            print("✅ GPU 테스트 성공! GPU가 정상적으로 작동합니다.")
            print(f"   결과 텐서 디바이스: {z.device}")
        except Exception as e:
            print(f"❌ GPU 테스트 실패: {e}")
    else:
        print("\n⚠️ CUDA를 사용할 수 없습니다.")
        print("   가능한 원인:")
        print("   1. CUDA가 설치되지 않았거나 버전이 맞지 않음")
        print("   2. PyTorch가 CPU 버전으로 설치됨")
        print("   3. GPU 드라이버가 설치되지 않음")
        print("\n   확인 방법:")
        print("   - nvidia-smi 명령어로 GPU 확인")
        print("   - pip list | grep torch 로 PyTorch 버전 확인")
        print("   - CUDA 버전과 PyTorch CUDA 버전이 일치하는지 확인")
    
    print("=" * 60)
    
except ImportError:
    print("❌ PyTorch가 설치되지 않았습니다.")
    sys.exit(1)

