# 머신러닝 학습의 Hello World 와 같은 MNIST(손글씨 숫자 인식) 문제를 신경망으로 풀어봅니다.
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, transforms

# 데이터 전처리 및 로드 함수
def load_data(data_dir="./app/data/number_mnist", batch_size=100):
    """
    MNIST 데이터를 다운로드하고 로드합니다.
    transforms.ToTensor()는 이미지를 텐서로 변환하고 0-1 범위로 정규화합니다.
    transforms.Normalize()는 평균 0.5, 표준편차 0.5로 정규화합니다.
    """
    transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize((0.5,), (0.5,))
    ])
    
    # 학습 데이터셋 로드
    train_dataset = datasets.MNIST(
        root=data_dir,
        train=True,
        download=True,
        transform=transform
    )
    
    # 테스트 데이터셋 로드
    test_dataset = datasets.MNIST(
        root=data_dir,
        train=False,
        download=True,
        transform=transform
    )
    
    # 데이터로더 생성
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False)
    
    return train_loader, test_loader

#########
# 신경망 모델 구성
######
# 입력 값의 차원은 [배치크기, 특성값] 으로 되어 있습니다.
# 손글씨 이미지는 28x28 픽셀로 이루어져 있고, 이를 784개의 특성값으로 정합니다.
# 결과는 0~9 의 10 가지 분류를 가집니다.
# 신경망의 레이어는 다음처럼 구성합니다.
# 784(입력 특성값)
#   -> 256 (히든레이어 뉴런 갯수) -> 256 (히든레이어 뉴런 갯수)
#   -> 10 (결과값 0~9 분류)

class MNISTNet(nn.Module):
    def __init__(self):
        super(MNISTNet, self).__init__()
        # 입력층: 784 -> 256
        self.fc1 = nn.Linear(784, 256)
        # 히든층: 256 -> 256
        self.fc2 = nn.Linear(256, 256)
        # 출력층: 256 -> 10
        self.fc3 = nn.Linear(256, 10)
        
    def forward(self, x):
        # 입력 이미지를 1차원 벡터로 변환 (배치 크기, 784)
        x = x.view(-1, 784)
        # 첫 번째 레이어: 입력값에 가중치를 곱하고 ReLU 함수를 이용하여 레이어를 만듭니다.
        x = torch.relu(self.fc1(x))
        # 두 번째 레이어: L1 레이어의 출력값에 가중치를 곱하고 ReLU 함수를 이용하여 레이어를 만듭니다.
        x = torch.relu(self.fc2(x))
        # 최종 모델의 출력값은 fc3를 통해 10개의 분류를 가지게 됩니다.
        x = self.fc3(x)
        return x

def train_model(model, train_loader, num_epochs=15, learning_rate=0.001):
    """
    신경망 모델 학습 함수
    """
    # 손실 함수 및 옵티마이저 정의
    # CrossEntropyLoss는 내부적으로 softmax를 적용하므로 logits만 전달하면 됩니다.
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=learning_rate)
    
    print("학습을 시작합니다...")
    for epoch in range(num_epochs):
        total_cost = 0
        total_batch = len(train_loader)
        
        for batch_idx, (batch_xs, batch_ys) in enumerate(train_loader):
            # 옵티마이저의 기울기 초기화
            optimizer.zero_grad()
            
            # 순전파: 모델에 입력을 전달하여 예측값 계산
            outputs = model(batch_xs)
            
            # 손실 계산
            loss = criterion(outputs, batch_ys)
            
            # 역전파: 기울기 계산
            loss.backward()
            
            # 가중치 업데이트
            optimizer.step()
            
            total_cost += loss.item()
        
        avg_cost = total_cost / total_batch
        print('Epoch:', '%04d' % (epoch + 1),
              'Avg. cost =', '{:.3f}'.format(avg_cost))
    
    print('최적화 완료!')
    return model


def evaluate_model(model, test_loader):
    """
    모델 평가 함수
    """
    # 모델을 평가 모드로 설정 (드롭아웃 등 비활성화)
    model.eval()
    
    correct = 0
    total = 0
    
    # 기울기 계산 비활성화 (평가 시에는 필요 없음)
    with torch.no_grad():
        for batch_xs, batch_ys in test_loader:
            # 모델로 예측
            outputs = model(batch_xs)
            
            # 예측값에서 가장 큰 값을 예측한 레이블이라고 평가합니다.
            # 예) [0.1 0 0 0.7 0 0.2 0 0 0 0] -> 3
            _, predicted = torch.max(outputs.data, 1)
            
            total += batch_ys.size(0)
            correct += (predicted == batch_ys).sum().item()
    
    accuracy = 100 * correct / total
    print('정확도:', '{:.2f}%'.format(accuracy))
    return accuracy


if __name__ == "__main__":
    #########
    # 데이터 로드
    ######
    batch_size = 100
    train_loader, test_loader = load_data(batch_size=batch_size)
    
    #########
    # 모델 생성
    ######
    model = MNISTNet()
    
    #########
    # 신경망 모델 학습
    ######
    num_epochs = 15
    model = train_model(model, train_loader, num_epochs=num_epochs)
    
    #########
    # 결과 확인
    ######
    evaluate_model(model, test_loader)

