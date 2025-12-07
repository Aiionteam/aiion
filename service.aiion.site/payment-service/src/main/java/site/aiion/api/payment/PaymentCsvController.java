package site.aiion.api.payment;

import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;
import site.aiion.api.payment.common.domain.Messenger;

@RestController
@RequiredArgsConstructor
@RequestMapping("/payments/csv")
public class PaymentCsvController {

    private final PaymentCsvImportService csvImportService;

    @PostMapping("/import")
    public Messenger importCsv(@RequestParam(defaultValue = "payment_test_data.csv") String fileName) {
        try {
            int count = csvImportService.importCsvToDatabase(fileName);
            return Messenger.builder()
                    .code(200)
                    .message("CSV 데이터 import 성공")
                    .data(count)
                    .build();
        } catch (Exception e) {
            return Messenger.builder()
                    .code(500)
                    .message("CSV import 실패: " + e.getMessage())
                    .build();
        }
    }

    @DeleteMapping("/all")
    public Messenger deleteAll() {
        try {
            csvImportService.deleteAllPayments();
            return Messenger.builder()
                    .code(200)
                    .message("모든 결제 데이터 삭제 완료")
                    .build();
        } catch (Exception e) {
            return Messenger.builder()
                    .code(500)
                    .message("데이터 삭제 실패: " + e.getMessage())
                    .build();
        }
    }
}

