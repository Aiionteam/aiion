import requests
from selenium import webdriver  # type: ignore
from selenium.webdriver.common.by import By  # type: ignore
from selenium.webdriver.support.ui import WebDriverWait  # type: ignore
from selenium.webdriver.support import expected_conditions as EC  # type: ignore
from selenium.webdriver.chrome.options import Options  # type: ignore
from selenium.webdriver.chrome.service import Service  # type: ignore
from bs4 import BeautifulSoup
import json
import time
from utils.user_agent import get_user_agent, get_headers

def _extract_movies(soup):
    """
    BeautifulSoup 객체에서 Netflix 영화 데이터 추출
    
    Args:
        soup: BeautifulSoup 객체
        
    Returns:
        list: 영화 데이터 리스트
    """
    movie_data = []
    
    # JustWatch 표준 구조: div.title-list-grid__item[data-title] 사용
    movie_items = soup.select('div.title-list-grid__item[data-title]')
    
    print(f"[디버깅] 발견된 영화 요소 수: {len(movie_items)}")
    
    for idx, item in enumerate(movie_items, 1):
        try:
            # 제목 추출 (data-title 속성)
            title = item.get('data-title', '').strip()
            
            # 링크 추출
            link = ""
            link_elem = item.select_one('a')
            if link_elem:
                link = link_elem.get('href', '').strip()
                if link and not link.startswith('http'):
                    if link.startswith('//'):
                        link = 'https:' + link
                    elif link.startswith('/'):
                        link = 'https://www.justwatch.com' + link
            
            # 이미지 추출
            image = ""
            img_elem = item.select_one('img')
            if img_elem:
                image = (img_elem.get('src', '') or 
                        img_elem.get('data-src', '') or 
                        img_elem.get('data-lazy-src', '')).strip()
                if image and not image.startswith('http'):
                    if image.startswith('//'):
                        image = 'https:' + image
                    elif image.startswith('/'):
                        image = 'https://www.justwatch.com' + image
            
            # 타입 추출 (영화/TV 프로그램)
            content_type = "영화"  # 이 페이지는 영화 산업 페이지이므로 모두 영화
            
            # 데이터 저장
            if title:
                movie_data.append({
                    "rank": idx,
                    "title": title,
                    "type": content_type,
                    "link": link if link else "N/A",
                    "image": image if image else "N/A"
                })
                
        except Exception as e:
            print(f"Error parsing movie {idx}: {e}")
            continue
    
    return movie_data

def _crawl_with_requests(url):
    """
    requests + BeautifulSoup으로 크롤링 시도 (정적 콘텐츠)
    
    Args:
        url: 크롤링할 URL
        
    Returns:
        list: 영화 데이터 리스트 (실패시 빈 리스트)
    """
    try:
        # User-Agent 포함 헤더 생성
        headers = get_headers(referer='https://www.justwatch.com/')
        
        print(f"[requests] URL 요청: {url}")
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        print(f"[requests] 응답 상태 코드: {response.status_code}")
        print(f"[requests] 응답 본문 길이: {len(response.text)}")
        
        soup = BeautifulSoup(response.text, 'lxml')
        
        # 디버깅: 페이지 제목 확인
        title = soup.select_one('title')
        if title:
            print(f"[requests] 페이지 제목: {title.get_text(strip=True)}")
        
        movie_data = _extract_movies(soup)
        
        # 데이터가 있으면 반환
        if movie_data and len(movie_data) > 0:
            print(f"[requests] {len(movie_data)}개 영화 크롤링 성공")
            return movie_data
        
        print(f"[requests] 영화 데이터 없음 (0개)")
        return []
        
    except Exception as e:
        print(f"[requests] 실패: {e}")
        import traceback
        traceback.print_exc()
        return []

def _crawl_with_selenium(url):
    """
    Selenium으로 크롤링 시도 (동적 콘텐츠, 모든 항목 수집)
    
    Args:
        url: 크롤링할 URL
        
    Returns:
        list: 영화 데이터 리스트 (실패시 빈 리스트)
    """
    driver = None
    try:
        # Chrome 옵션 설정
        chrome_options = Options()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--window-size=1920,1080')
        # 랜덤 User-Agent 설정
        chrome_options.add_argument(f'user-agent={get_user_agent()}')
        
        # Selenium 4.x 자동 ChromeDriver 관리 (Service 클래스 사용)
        service = Service()  # 자동으로 ChromeDriver 다운로드 및 관리
        driver = webdriver.Chrome(service=service, options=chrome_options)
        driver.get(url)
        
        # 페이지 로딩 대기
        print("[selenium] 페이지 로딩 대기 중...")
        time.sleep(5)
        
        # 동적 콘텐츠 로딩 대기
        try:
            print("[selenium] 영화 목록 로딩 대기 중...")
            WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "div.title-list-grid__item[data-title]"))
            )
            print("[selenium] 영화 목록 요소 발견")
        except Exception as e:
            print(f"[selenium] 영화 목록 요소 발견 실패: {e}")
            # 계속 진행
        
        # 디버깅: 페이지 제목 확인
        page_title = driver.title
        print(f"[selenium] 페이지 제목: {page_title}")
        
        # 무한 스크롤 처리 - 페이지 끝까지 모든 항목 수집
        print("스크롤하여 모든 콘텐츠 로드 중...")
        
        # 초기 항목 수 확인
        initial_items = driver.find_elements(By.CSS_SELECTOR, "div.title-list-grid__item[data-title]")
        last_count = len(initial_items)
        print(f"초기 {last_count}개 영화 발견")
        
        scroll_attempts = 0
        max_scroll_attempts = 500
        no_new_content_count = 0
        scroll_step = 500
        
        while scroll_attempts < max_scroll_attempts:
            # 현재 수집된 항목 수 확인
            current_items = driver.find_elements(By.CSS_SELECTOR, "div.title-list-grid__item[data-title]")
            current_count = len(current_items)
            
            # 현재 스크롤 위치와 페이지 높이
            current_scroll = driver.execute_script("return window.pageYOffset;")
            page_height = driver.execute_script("return document.body.scrollHeight;")
            viewport_height = driver.execute_script("return window.innerHeight;")
            
            # 점진적 스크롤
            scroll_position = min(current_scroll + scroll_step, page_height - viewport_height)
            driver.execute_script(f"window.scrollTo(0, {scroll_position});")
            time.sleep(1)  # 스크롤 후 대기
            
            # 스크롤 이벤트 트리거
            driver.execute_script("""
                window.dispatchEvent(new Event('scroll'));
                window.dispatchEvent(new Event('wheel'));
            """)
            time.sleep(0.5)
            
            # 새로운 페이지 높이와 항목 수 확인
            new_page_height = driver.execute_script("return document.body.scrollHeight;")
            new_items = driver.find_elements(By.CSS_SELECTOR, "div.title-list-grid__item[data-title]")
            new_count = len(new_items)
            
            # 새로운 콘텐츠가 로드되었는지 확인
            if new_count > current_count:
                no_new_content_count = 0
                if scroll_attempts % 20 == 0:  # 20회마다 출력
                    print(f"스크롤 {scroll_attempts + 1}: {new_count}개 영화 발견...")
                last_count = new_count
            else:
                no_new_content_count += 1
            
            # 페이지 끝에 도달했는지 확인
            new_scroll = driver.execute_script("return window.pageYOffset;")
            if new_scroll >= new_page_height - viewport_height - 100:
                # 끝에 도달했지만 더 로드될 수 있으므로 여러 번 시도
                for retry in range(5):
                    driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                    time.sleep(2)
                    
                    # 스크롤 이벤트 트리거
                    driver.execute_script("""
                        window.dispatchEvent(new Event('scroll'));
                        window.dispatchEvent(new Event('wheel'));
                    """)
                    time.sleep(1.5)
                    
                    # 최종 확인
                    final_items = driver.find_elements(By.CSS_SELECTOR, "div.title-list-grid__item[data-title]")
                    final_count = len(final_items)
                    final_page_height = driver.execute_script("return document.body.scrollHeight;")
                    
                    if final_count > new_count:
                        print(f"페이지 끝에서 추가 로드 (시도 {retry+1}): {final_count}개 영화 발견...")
                        new_count = final_count
                        last_count = final_count
                        no_new_content_count = 0
                        if final_page_height > new_page_height:
                            new_page_height = final_page_height
                            continue
                    else:
                        break
                
                # 더 이상 로드되지 않으면 종료
                if no_new_content_count >= 5:
                    print(f"더 이상 새로운 콘텐츠가 없습니다. (현재 {new_count}개 영화)")
                    break
            
            # 페이지 높이가 증가하지 않고 항목 수도 증가하지 않으면 카운트 증가
            if new_page_height == page_height and new_count == current_count:
                no_new_content_count += 1
                if no_new_content_count >= 10:
                    print(f"변화 없음. (현재 {new_count}개 영화)")
                    break
            
            scroll_attempts += 1
        
        # 최종 여러 번 스크롤 및 대기
        print("최종 스크롤 및 대기 중...")
        for final_attempt in range(10):
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)
            driver.execute_script("""
                window.dispatchEvent(new Event('scroll'));
                window.dispatchEvent(new Event('wheel'));
            """)
            time.sleep(1.5)
            
            if final_attempt % 3 == 0:
                check_items = driver.find_elements(By.CSS_SELECTOR, "div.title-list-grid__item[data-title]")
                print(f"최종 확인 {final_attempt+1}/10: {len(check_items)}개 영화")
        
        final_check = driver.find_elements(By.CSS_SELECTOR, "div.title-list-grid__item[data-title]")
        print(f"최종 스크롤 완료. 총 {scroll_attempts}회 시도, 최종 {len(final_check)}개 영화")
        
        # 최종 페이지 소스 가져오기
        page_source = driver.page_source
        print(f"[selenium] 페이지 소스 길이: {len(page_source)}")
        soup = BeautifulSoup(page_source, 'lxml')
        movie_data = _extract_movies(soup)
        
        # 중복 제거 (제목 기준)
        seen_titles = set()
        unique_data = []
        for item in movie_data:
            if item['title'] not in seen_titles:
                seen_titles.add(item['title'])
                unique_data.append(item)
        
        # rank 재정렬
        for idx, item in enumerate(unique_data, 1):
            item['rank'] = idx
        
        if unique_data and len(unique_data) > 0:
            print(f"[selenium] 총 {len(unique_data)}개 영화 크롤링 성공")
            return unique_data
        
        print("[selenium] 영화 데이터 없음 (0개)")
        return []
        
    except Exception as e:
        print(f"[selenium] 실패: {e}")
        import traceback
        traceback.print_exc()
        return []
    finally:
        if driver:
            driver.quit()

def crawl_netflix_movies():
    """
    JustWatch Netflix 영화 산업 목록 크롤링 (모든 항목 수집)
    
    Returns:
        list: Netflix 영화 데이터 (제목, 타입, 링크, 이미지)
    """
    url = "https://www.justwatch.com/kr/%EB%8F%99%EC%98%81%EC%83%81%EC%84%9C%EB%B9%84%EC%8A%A4/netflix/%EC%98%81%ED%99%94%EC%82%B0%EC%97%85"
    
    # JustWatch는 동적 콘텐츠가 많으므로 바로 Selenium 사용
    print("Selenium으로 모든 콘텐츠 크롤링 시작...")
    movie_data = _crawl_with_selenium(url)
    
    # Selenium 실패시 requests로 재시도
    if not movie_data or len(movie_data) == 0:
        print("Selenium 실패, requests로 재시도...")
        movie_data = _crawl_with_requests(url)
    
    return movie_data


if __name__ == "__main__":
    # 크롤링 실행
    print("JustWatch Netflix 영화 산업 목록 크롤링 시작...")
    movie_data = crawl_netflix_movies()
    
    # JSON 형태로 출력
    if movie_data:
        print(json.dumps(movie_data, ensure_ascii=False, indent=2))
        print(f"\n총 {len(movie_data)}개의 영화를 크롤링했습니다.")
    else:
        print("크롤링 실패 또는 데이터가 없습니다.")

