package site.aiion.api.pathfinder.csv;

import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Component;

import lombok.extern.slf4j.Slf4j;

/**
 * 난중일기 CSV 파일 파서
 * /app/nanjung.csv 파일을 읽어서 CSVRecord 리스트로 변환
 */
@Slf4j
@Component
public class NanjungCsvParser {

    private static final String CSV_FILE_PATH = "/app/nanjung.csv";
    private static final String[] HEADERS = { "id", "localdate", "title", "content", "userId" };

    /**
     * CSV 파일을 파싱하여 CSVRecord 리스트로 반환
     * 
     * @return 파싱된 CSVRecord 리스트
     * @throws IOException 파일 읽기 실패 시
     */
    public List<CSVRecord> parse() throws IOException {
        File csvFile = new File(CSV_FILE_PATH);
        
        if (!csvFile.exists()) {
            log.warn("CSV 파일을 찾을 수 없습니다: {}", CSV_FILE_PATH);
            throw new IOException("CSV 파일을 찾을 수 없습니다: " + CSV_FILE_PATH);
        }

        log.info("CSV 파일 파싱 시작: {}", CSV_FILE_PATH);

        CSVFormat format = CSVFormat.Builder.create()
                .setHeader(HEADERS)
                .setSkipHeaderRecord(true)
                .setIgnoreHeaderCase(true)
                .setTrim(true)
                .setQuote('"')
                .setEscape('\\')
                .build();

        try (FileReader reader = new FileReader(csvFile);
             CSVParser parser = new CSVParser(reader, format)) {

            List<CSVRecord> records = new ArrayList<>();
            for (CSVRecord record : parser) {
                records.add(record);
            }

            log.info("CSV 파일 파싱 완료: {} 개의 레코드", records.size());
            return records;
        } catch (IOException e) {
            log.error("CSV 파일 파싱 중 오류 발생: {}", e.getMessage(), e);
            throw e;
        }
    }

    /**
     * CSV 파일 존재 여부 확인
     * 
     * @return 파일이 존재하면 true
     */
    public boolean fileExists() {
        File csvFile = new File(CSV_FILE_PATH);
        return csvFile.exists() && csvFile.isFile();
    }
}

