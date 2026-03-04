package helix.example.demo.expense;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

public class ExpenseDTOs {

    // ---------- REQUEST DTOs ----------

    // For manual entry
    @Data
    public static class ManualExpenseRequest {
        @NotBlank(message = "Title is required")
        private String title;

        @NotNull(message = "Total amount is required")
        private Double totalAmount;

        @NotBlank(message = "Group ID is required")
        private String groupId;

        // Who paid — if not provided, logged in user is assumed to have paid
        private String paidByEmail;

        // Description of the expense
        private String description;

        // Notes/additional info
        private String notes;

        private List<ItemRequest> items;
    }

    // For natural language entry
    @Data
    public static class NaturalLanguageRequest {
        @NotBlank(message = "Text is required")
        private String text; // "Rahul and I had dinner, I paid 800"

        @NotBlank(message = "Group ID is required")
        private String groupId;
    }

    // For individual item in manual entry
    @Data
    public static class ItemRequest {
        @NotBlank(message = "Item name is required")
        private String itemName;

        @NotNull(message = "Price is required")
        private Double price;

        private Integer quantity = 1;

        private String assignedToEmail; // optional
    }

    // ---------- RESPONSE DTOs ----------

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ItemResponse {
        private String id;
        private String itemName;
        private Double price;
        private Integer quantity;
        private String assignedTo; // person's name
        private String assignedToEmail;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExpenseResponse {
        private String id;
        private String title;
        private String description;      // ← add this
        private Double totalAmount;
        private String expenseType;
        private String paidBy;
        private String paidByEmail;
        private String groupId;
        private String groupName;
        private List<ItemResponse> items;
        private String notes;
        private LocalDateTime createdAt;
    }

    // AI extracted items response
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AiExtractedExpense {
        private String title;
        private Double totalAmount;
        private List<ItemResponse> items;
        private String rawText; // original OCR or natural language text
    }
}