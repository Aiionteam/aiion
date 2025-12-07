package site.aiion.api.payment.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

/**
 * Toss Payments API 클라이언트
 */
@Slf4j
@Component
public class TossPaymentsClient {
    
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    
    @Value("${toss.payments.secret-key}")
    private String secretKey;
    
    @Value("${toss.payments.base-url:https://api.tosspayments.com}")
    private String baseUrl;
    
    public TossPaymentsClient(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }
    
    /**
     * 결제 요청
     */
    public PaymentRequestResponse requestPayment(
            String orderId,
            Long amount,
            String orderName,
            String customerName,
            String customerEmail) {
        
        try {
            String url = baseUrl + "/v1/payments/confirm";
            
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("amount", amount);
            requestBody.put("orderId", orderId);
            requestBody.put("orderName", orderName);
            requestBody.put("customerName", customerName);
            requestBody.put("customerEmail", customerEmail);
            requestBody.put("successUrl", "http://localhost:3000/payment/success");
            requestBody.put("failUrl", "http://localhost:3000/payment/fail");
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Basic " + Base64.getEncoder().encodeToString((secretKey + ":").getBytes()));
            
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            
            ResponseEntity<Map> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    request,
                    Map.class
            );
            
            Map<String, Object> responseBody = response.getBody();
            
            PaymentRequestResponse result = new PaymentRequestResponse();
            result.setPaymentKey((String) responseBody.get("paymentKey"));
            result.setCheckoutUrl((String) responseBody.get("checkoutUrl"));
            
            return result;
        } catch (Exception e) {
            log.error("[TossPaymentsClient] 결제 요청 오류: {}", e.getMessage());
            throw new RuntimeException("Toss Payments API 호출 실패: " + e.getMessage());
        }
    }
    
    /**
     * 결제 승인
     */
    public PaymentConfirmResponse confirmPayment(
            String paymentKey,
            String orderId,
            Long amount) {
        
        try {
            String url = baseUrl + "/v1/payments/confirm";
            
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("paymentKey", paymentKey);
            requestBody.put("orderId", orderId);
            requestBody.put("amount", amount);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Basic " + Base64.getEncoder().encodeToString((secretKey + ":").getBytes()));
            
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            
            ResponseEntity<Map> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    request,
                    Map.class
            );
            
            Map<String, Object> responseBody = response.getBody();
            
            PaymentConfirmResponse result = new PaymentConfirmResponse();
            result.setStatus((String) responseBody.get("status"));
            result.setApprovedAt((String) responseBody.get("approvedAt"));
            
            return result;
        } catch (Exception e) {
            log.error("[TossPaymentsClient] 결제 승인 오류: {}", e.getMessage());
            throw new RuntimeException("Toss Payments 결제 승인 실패: " + e.getMessage());
        }
    }
    
    /**
     * 결제 취소
     */
    public void cancelPayment(
            String paymentKey,
            String cancelReason,
            Long cancelAmount) {
        
        try {
            String url = baseUrl + "/v1/payments/" + paymentKey + "/cancel";
            
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("cancelReason", cancelReason);
            requestBody.put("cancelAmount", cancelAmount);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Basic " + Base64.getEncoder().encodeToString((secretKey + ":").getBytes()));
            
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            
            restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    request,
                    Map.class
            );
        } catch (Exception e) {
            log.error("[TossPaymentsClient] 결제 취소 오류: {}", e.getMessage());
            throw new RuntimeException("Toss Payments 결제 취소 실패: " + e.getMessage());
        }
    }
    
    @Data
    public static class PaymentRequestResponse {
        private String paymentKey;
        private String checkoutUrl;
    }
    
    @Data
    public static class PaymentConfirmResponse {
        private String status;
        private String approvedAt;
    }
}

