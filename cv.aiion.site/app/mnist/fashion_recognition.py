# Fashion-MNIST 데이터셋을 사용한 의류 이미지 분류 문제를 신경망으로 풀어봅니다.
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
import matplotlib.pyplot as plt
import numpy as np

class FashionMNISTNet(nn.Module):
    """
    Fashion-MNIST 분류를 위한 신경망 모델
    Flatten -> Dense(128, relu) -> Dense(10, softmax)
    
    relu (Rectified Linear Unit 정류한 선형 유닛)
    미분 가능한 0과 1사이의 값을 갖도록 하는 알고리즘
    softmax
    nn (neural network)의 최상위층에서 사용되며 classification을 위한 function
    결과를 확률값으로 해석하기 위한 알고리즘
    """
    def __init__(self):
        super(FashionMNISTNet, self).__init__()
        # Flatten: 28x28 이미지를 784차원 벡터로 변환
        self.flatten = nn.Flatten()
        # Dense 레이어: 784 -> 128
        self.fc1 = nn.Linear(784, 128)
        # 출력 레이어: 128 -> 10 (10개 클래스)
        self.fc2 = nn.Linear(128, 10)
        
    def forward(self, x):
        # 입력 이미지를 1차원 벡터로 변환 (배치 크기, 784)
        x = self.flatten(x)
        # 첫 번째 레이어: ReLU 활성화 함수 적용
        x = torch.relu(self.fc1(x))
        # 출력 레이어: softmax는 CrossEntropyLoss에서 자동으로 처리되므로 logits 반환
        x = self.fc2(x)
        return x


class FashionMNISTTest:
    def __init__(self):
        self.class_names = ['T-shirt/top', 'Trouser', 'Pullover', 'Dress', 'Coat',
                           'Sandal', 'Shirt', 'Sneaker', 'Bag', 'Ankle boot']
    
    def load_data(self, data_dir="./app/data/fashion_mnist", batch_size=100):
        """
        Fashion-MNIST 데이터를 다운로드하고 로드합니다.
        transforms.ToTensor()는 이미지를 텐서로 변환하고 0-1 범위로 정규화합니다.
        """
        transform = transforms.Compose([
            transforms.ToTensor()  # 0-255를 0-1로 정규화 (255.0으로 나누는 것과 동일)
        ])
        
        # 학습 데이터셋 로드
        train_dataset = datasets.FashionMNIST(
            root=data_dir,
            train=True,
            download=True,
            transform=transform
        )
        
        # 테스트 데이터셋 로드
        test_dataset = datasets.FashionMNIST(
            root=data_dir,
            train=False,
            download=True,
            transform=transform
        )
        
        # 데이터로더 생성
        train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
        test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False)
        
        return train_loader, test_loader, train_dataset, test_dataset
    
    def visualize_samples(self, train_dataset, num_samples=25):
        """
        학습 데이터 샘플을 시각화합니다.
        """
        # 데이터셋에서 샘플 가져오기
        fig = plt.figure(figsize=(10, 10))
        for i in range(num_samples):
            image, label = train_dataset[i]
            # 이미지를 numpy 배열로 변환 (채널, 높이, 너비 -> 높이, 너비)
            img = image.squeeze().numpy()
            
            plt.subplot(5, 5, i + 1)
            plt.xticks([])
            plt.yticks([])
            plt.grid(False)
            plt.imshow(img, cmap=plt.cm.binary)
            plt.xlabel(self.class_names[label])
        # plt.show()  # 주석 해제하면 이미지 표시
        return fig
    
    def train_model(self, model, train_loader, num_epochs=5, learning_rate=0.001):
        """
        신경망 모델 학습 함수
        """
        # 손실 함수 및 옵티마이저 정의
        # CrossEntropyLoss는 내부적으로 softmax를 적용하므로 logits만 전달하면 됩니다.
        criterion = nn.CrossEntropyLoss()
        optimizer = optim.Adam(model.parameters(), lr=learning_rate)
        
        model.train()  # 학습 모드로 설정
        print("학습을 시작합니다...")
        
        for epoch in range(num_epochs):
            running_loss = 0.0
            correct = 0
            total = 0
            
            for batch_idx, (images, labels) in enumerate(train_loader):
                # 옵티마이저의 기울기 초기화
                optimizer.zero_grad()
                
                # 순전파: 모델에 입력을 전달하여 예측값 계산
                outputs = model(images)
                
                # 손실 계산
                loss = criterion(outputs, labels)
                
                # 역전파: 기울기 계산
                loss.backward()
                
                # 가중치 업데이트
                optimizer.step()
                
                # 정확도 계산
                _, predicted = torch.max(outputs.data, 1)
                total += labels.size(0)
                correct += (predicted == labels).sum().item()
                running_loss += loss.item()
            
            epoch_loss = running_loss / len(train_loader)
            epoch_acc = 100 * correct / total
            print(f'Epoch [{epoch + 1}/{num_epochs}], Loss: {epoch_loss:.4f}, Accuracy: {epoch_acc:.2f}%')
        
        print('최적화 완료!')
        return model
    
    def evaluate_model(self, model, test_loader):
        """
        모델 평가 함수
        """
        model.eval()  # 평가 모드로 설정
        
        correct = 0
        total = 0
        test_loss = 0.0
        criterion = nn.CrossEntropyLoss()
        
        # 기울기 계산 비활성화 (평가 시에는 필요 없음)
        with torch.no_grad():
            for images, labels in test_loader:
                outputs = model(images)
                loss = criterion(outputs, labels)
                test_loss += loss.item()
                
                # 예측값에서 가장 큰 값을 예측한 레이블이라고 평가합니다.
                _, predicted = torch.max(outputs.data, 1)
                
                total += labels.size(0)
                correct += (predicted == labels).sum().item()
        
        test_loss = test_loss / len(test_loader)
        test_acc = 100 * correct / total
        print(f'\n테스트 손실: {test_loss:.4f}')
        print(f'테스트 정확도: {test_acc:.2f}%')
        
        return test_loss, test_acc
    
    def predict(self, model, test_loader):
        """
        테스트 데이터에 대한 예측을 수행합니다.
        """
        model.eval()
        all_predictions = []
        all_labels = []
        all_images = []
        
        with torch.no_grad():
            for images, labels in test_loader:
                outputs = model(images)
                # softmax를 적용하여 확률값으로 변환
                probabilities = torch.nn.functional.softmax(outputs, dim=1)
                all_predictions.append(probabilities.cpu().numpy())
                all_labels.append(labels.cpu().numpy())
                all_images.append(images.cpu().numpy())
        
        # 모든 배치를 하나로 합치기
        predictions = np.concatenate(all_predictions, axis=0)
        true_labels = np.concatenate(all_labels, axis=0)
        test_images = np.concatenate(all_images, axis=0)
        
        return predictions, true_labels, test_images
    
    def plot_image(self, i, predictions_array, true_label, img):
        """
        예측 결과와 실제 이미지를 시각화합니다.
        """
        print(' === plot_image 로 진입 ===')
        predictions_array, true_label, img = predictions_array[i], true_label[i], img[i]
        
        # 이미지가 (1, 28, 28) 형태인 경우 (1, 28, 28) -> (28, 28)로 변환
        if len(img.shape) == 3:
            img = img.squeeze()
        
        plt.grid(False)
        plt.xticks([])
        plt.yticks([])
        
        plt.imshow(img, cmap=plt.cm.binary)
        # plt.show()  # 주석 해제하면 이미지 표시
        
        predicted_label = np.argmax(predictions_array)
        if predicted_label == true_label:
            color = 'blue'
        else:
            color = 'red'
        
        plt.xlabel("{} {:2.0f}% ({})".format(self.class_names[predicted_label],
                                              100 * np.max(predictions_array),
                                              self.class_names[true_label]),
                   color=color)
    
    @staticmethod
    def plot_value_array(i, predictions_array, true_label):
        """
        예측 확률값을 막대 그래프로 시각화합니다.
        """
        predictions_array, true_label = predictions_array[i], true_label[i]
        plt.grid(False)
        plt.xticks([])
        plt.yticks([])
        thisplot = plt.bar(range(10), predictions_array, color="#777777")
        plt.ylim([0, 1])
        predicted_label = np.argmax(predictions_array)
        
        thisplot[predicted_label].set_color('red')
        thisplot[true_label].set_color('blue')


if __name__ == "__main__":
    #########
    # 데이터 로드
    ######
    fashion_test = FashionMNISTTest()
    batch_size = 100
    train_loader, test_loader, train_dataset, test_dataset = fashion_test.load_data(batch_size=batch_size)
    
    # 데이터셋 정보 출력
    print(f'학습 데이터: {len(train_dataset)}개')
    print(f'테스트 데이터: {len(test_dataset)}개')
    
    #########
    # 샘플 이미지 시각화
    ######
    # fashion_test.visualize_samples(train_dataset, num_samples=25)
    
    #########
    # 모델 생성
    ######
    model = FashionMNISTNet()
    
    #########
    # 신경망 모델 학습
    ######
    num_epochs = 10
    model = fashion_test.train_model(model, train_loader, num_epochs=num_epochs)
    
    #########
    # 결과 확인
    ######
    test_loss, test_acc = fashion_test.evaluate_model(model, test_loader)
    
    #########
    # 예측 수행
    ######
    predictions, test_labels, test_images = fashion_test.predict(model, test_loader)
    
    # 예측 결과 확인 (3번째 이미지)
    print('\n3번째 이미지 예측 결과:')
    print(predictions[3])
    predicted_class = np.argmax(predictions[3])
    print(f'예측된 클래스: {predicted_class} ({fashion_test.class_names[predicted_class]})')
    print(f'실제 클래스: {test_labels[3]} ({fashion_test.class_names[test_labels[3]]})')
    
    # 결과 반환 (원본 코드와의 호환성을 위해)
    arr = [predictions, test_labels, test_images]
    
    # 시각화 예제 (주석 해제하여 사용)
    # fashion_test.plot_image(3, predictions, test_labels, test_images)
    # FashionMNISTTest.plot_value_array(3, predictions, test_labels)
    # plt.show()

