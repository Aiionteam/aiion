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
    BeautifulSoup 객체에서 영화 데이터 추출
    
    Args:
        soup: BeautifulSoup 객체
        
    Returns:
        list: 영화 데이터 리스트
    """
    movie_data = []
    
    # tbody > tr 구조로 영화 목록 찾기
    rows = soup.select('tbody tr')
    
    print(f"[디버깅] 발견된 영화 행 수: {len(rows)}")
    
    for idx, row in enumerate(rows, 1):
        try:
            # 순위 추출
            rank_elem = row.select_one('td.num')
            rank = rank_elem.get_text(strip=True) if rank_elem else str(idx)
            
            # 제목 추출
            title_elem = row.select_one('td.title a.ti')
            title = title_elem.get_text(strip=True) if title_elem else "N/A"
            
            # 감독 추출 (첫 번째 fcGray1 클래스 td)
            director_elem = row.select('td.fcGray1')
            director = director_elem[0].get_text(strip=True) if len(director_elem) > 0 else "N/A"
            
            # 제작년도 추출 (두 번째 fcGray1 클래스 td)
            year = director_elem[1].get_text(strip=True) if len(director_elem) > 1 else "N/A"
            
            # 영상도서관 링크 추출 (4번째 td에서)
            links = []
            all_tds = row.select('td')
            if len(all_tds) >= 4:
                # 4번째 td (인덱스 3)에서 링크 추출
                link_td = all_tds[3]
                link_elems = link_td.select('a')
                for link_elem in link_elems:
                    href = link_elem.get('href', '')
                    if href and 'koreafilm.or.kr/library' in href:
                        link_text = link_elem.select_one('span')
                        link_type = link_text.get_text(strip=True) if link_text else ""
                        links.append({
                            "type": link_type,
                            "url": href
                        })
            
            # 데이터 저장
            movie_data.append({
                "rank": rank,
                "title": title,
                "director": director,
                "year": year,
                "links": links
            })
            
        except Exception as e:
            print(f"Error parsing movie row {idx}: {e}")
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
        headers = get_headers(referer='https://www.kmdb.or.kr/')
        
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
    Selenium으로 크롤링 시도 (동적 콘텐츠)
    
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
        
        # 테이블 로딩 대기
        try:
            print("[selenium] 테이블 로딩 대기 중...")
            WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "tbody tr"))
            )
            print("[selenium] 테이블 요소 발견")
        except Exception as e:
            print(f"[selenium] 테이블 요소 발견 실패: {e}")
            # 계속 진행
        
        # 디버깅: 페이지 제목 확인
        page_title = driver.title
        print(f"[selenium] 페이지 제목: {page_title}")
        
        # 디버깅: 현재 페이지의 행 수 확인
        try:
            rows = driver.find_elements(By.CSS_SELECTOR, "tbody tr")
            print(f"[selenium] 발견된 영화 행 수: {len(rows)}")
        except:
            pass
        
        # 페이지 소스 가져오기
        page_source = driver.page_source
        print(f"[selenium] 페이지 소스 길이: {len(page_source)}")
        soup = BeautifulSoup(page_source, 'lxml')
        movie_data = _extract_movies(soup)
        
        if movie_data and len(movie_data) > 0:
            print(f"[selenium] {len(movie_data)}개 영화 크롤링 성공")
            return movie_data
        
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

def crawl_kmdb_movie_list():
    """
    KMDB 뉴욕타임즈 21세기 영화 100선 크롤링
    
    Returns:
        list: 영화 데이터 (순위, 제목, 감독, 제작년도, 링크)
    """
    url = "https://www.kmdb.or.kr/db/list/detail/533/1401"
    
    # Selenium으로 먼저 시도 (동적 콘텐츠 가능성)
    print("Selenium으로 크롤링 시작...")
    movie_data = _crawl_with_selenium(url)
    
    # Selenium 실패시 requests로 재시도
    if not movie_data or len(movie_data) == 0:
        print("Selenium 실패, requests로 재시도...")
        movie_data = _crawl_with_requests(url)
    
    return movie_data


if __name__ == "__main__":
    # 크롤링 실행
    print("KMDB 뉴욕타임즈 21세기 영화 100선 크롤링 시작...")
    movie_data = crawl_kmdb_movie_list()
    
    # JSON 형태로 출력
    if movie_data:
        print(json.dumps(movie_data, ensure_ascii=False, indent=2))
        print(f"\n총 {len(movie_data)}개의 영화를 크롤링했습니다.")
    else:
        print("크롤링 실패 또는 데이터가 없습니다.")

