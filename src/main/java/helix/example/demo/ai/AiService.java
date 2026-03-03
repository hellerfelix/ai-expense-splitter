package helix.example.demo.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import helix.example.demo.expense.ExpenseDTOs;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiService {

    @Value("${ai.api.key}")
    private String apiKey;

    @Value("${ai.model}")
    private String model;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // ─── 1. Extract items from natural language ───────────────────────────

    public ExpenseDTOs.AiExtractedExpense extractFromNaturalLanguage(String text) {
        String prompt = """
            Extract expense details from this text and return ONLY a JSON object.
            No explanation, no markdown, just raw JSON.
            
            Text: "%s"
            
            Return this exact format:
            {
              "title": "short title for this expense",
              "totalAmount": 0.0,
              "items": [
                {
                  "itemName": "item name",
                  "price": 0.0,
                  "quantity": 1,
                  "assignedTo": "person name or null",
                  "assignedToEmail": null
                }
              ]
            }
            
            Rules:
            - If total amount is mentioned use it, otherwise sum all items
            - If items are not mentioned create one item with the total
            - Extract person names if mentioned
            - Fix any spelling mistakes
            """.formatted(text);

        String aiResponse = callOpenAI(prompt);
        return parseAiResponse(aiResponse, text);
    }

    // ─── 2. Extract items from receipt image ──────────────────────────────

    public ExpenseDTOs.AiExtractedExpense extractFromReceipt(MultipartFile file) {
        try {
            // Convert image to base64
            byte[] imageBytes = file.getBytes();
            String base64Image = java.util.Base64.getEncoder().encodeToString(imageBytes);
            String mimeType = file.getContentType() != null
                    ? file.getContentType() : "image/jpeg";

            String prompt = """
                This is a receipt image. Extract all food/drink line items.
                Return ONLY a JSON object, no explanation, no markdown.
                
                Return this exact format:
                {
                  "title": "short title like Restaurant Name or Bill",
                  "totalAmount": 0.0,
                  "items": [
                    {
                      "itemName": "item name",
                      "price": 0.0,
                      "quantity": 1,
                      "assignedTo": null,
                      "assignedToEmail": null
                    }
                  ]
                }
                
                Rules:
                - Extract only food/drink items
                - Ignore taxes, service charge, subtotal, total lines
                - Fix OCR spelling errors
                - If quantity not clear default to 1
                - Total amount should be the final bill amount including taxes
                """;

            String aiResponse = callOpenAIWithImage(prompt, base64Image, mimeType);
            return parseAiResponse(aiResponse, "Receipt upload");

        } catch (Exception e) {
            log.error("Error extracting from receipt: {}", e.getMessage());
            throw new RuntimeException("Failed to process receipt image. Please try again.");
        }
    }

    // ─── 3. Call OpenAI API (text only) ───────────────────────────────────

    private String callOpenAI(String prompt) {
        try {
            WebClient client = WebClient.builder()
                    .baseUrl("https://api.openai.com")
                    .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .defaultHeader(HttpHeaders.CONTENT_TYPE,
                            MediaType.APPLICATION_JSON_VALUE)
                    .build();

            Map<String, Object> requestBody = Map.of(
                    "model", model,
                    "messages", List.of(
                            Map.of("role", "user", "content", prompt)
                    ),
                    "max_tokens", 1000,
                    "temperature", 0.1
            );

            String response = client.post()
                    .uri("/v1/chat/completions")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            JsonNode root = objectMapper.readTree(response);
            return root.path("choices")
                    .path(0)
                    .path("message")
                    .path("content")
                    .asText();

        } catch (Exception e) {
            log.error("OpenAI API error: {}", e.getMessage());
            throw new RuntimeException("AI service unavailable. Please try again.");
        }
    }

    // ─── 4. Call OpenAI API (with image) ──────────────────────────────────

    private String callOpenAIWithImage(
            String prompt, String base64Image, String mimeType) {
        try {
            WebClient client = WebClient.builder()
                    .baseUrl("https://api.openai.com")
                    .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .defaultHeader(HttpHeaders.CONTENT_TYPE,
                            MediaType.APPLICATION_JSON_VALUE)
                    .build();

            // OpenAI vision API format
            Map<String, Object> imageUrl = Map.of(
                    "url", "data:" + mimeType + ";base64," + base64Image
            );

            Map<String, Object> imageContent = Map.of(
                    "type", "image_url",
                    "image_url", imageUrl
            );

            Map<String, Object> textContent = Map.of(
                    "type", "text",
                    "text", prompt
            );

            Map<String, Object> requestBody = Map.of(
                    "model", "gpt-4o",
                    "messages", List.of(
                            Map.of("role", "user",
                                    "content", List.of(textContent, imageContent))
                    ),
                    "max_tokens", 1000
            );

            String response = client.post()
                    .uri("/v1/chat/completions")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            JsonNode root = objectMapper.readTree(response);
            return root.path("choices")
                    .path(0)
                    .path("message")
                    .path("content")
                    .asText();

        } catch (Exception e) {
            log.error("OpenAI Vision API error: {}", e.getMessage());
            throw new RuntimeException(
                    "Failed to process image with AI. Please try again.");
        }
    }

    // ─── 5. Parse AI JSON response ────────────────────────────────────────

    private ExpenseDTOs.AiExtractedExpense parseAiResponse(
            String aiResponse, String originalText) {
        try {
            // Clean response — remove markdown if AI added it
            String cleaned = aiResponse
                    .replace("```json", "")
                    .replace("```", "")
                    .trim();

            JsonNode root = objectMapper.readTree(cleaned);

            String title = root.path("title").asText("Expense");
            double totalAmount = root.path("totalAmount").asDouble(0.0);

            List<ExpenseDTOs.ItemResponse> items = new ArrayList<>();
            JsonNode itemsNode = root.path("items");

            if (itemsNode.isArray()) {
                for (JsonNode item : itemsNode) {
                    items.add(ExpenseDTOs.ItemResponse.builder()
                            .itemName(item.path("itemName").asText())
                            .price(item.path("price").asDouble())
                            .quantity(item.path("quantity").asInt(1))
                            .assignedTo(item.path("assignedTo").asText(null))
                            .assignedToEmail(item.path("assignedToEmail").asText(null))
                            .build());
                }
            }

            // If total is 0, sum up items
            if (totalAmount == 0.0 && !items.isEmpty()) {
                totalAmount = items.stream()
                        .mapToDouble(i -> i.getPrice() * i.getQuantity())
                        .sum();
            }

            return ExpenseDTOs.AiExtractedExpense.builder()
                    .title(title)
                    .totalAmount(totalAmount)
                    .items(items)
                    .rawText(originalText)
                    .build();

        } catch (Exception e) {
            log.error("Failed to parse AI response: {}", aiResponse);
            throw new RuntimeException(
                    "AI returned unexpected response. Please try again.");
        }
    }
}