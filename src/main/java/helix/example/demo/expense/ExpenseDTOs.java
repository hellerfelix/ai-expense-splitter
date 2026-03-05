package helix.example.demo.expense;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

public class ExpenseDTOs {

    // ---------- REQUEST DTOs ----------

    @Data
    public static class ManualExpenseRequest {
        @NotBlank(message = "Title is required")
        private String title;

        @NotNull(message = "Total amount is required")
        private Double totalAmount;

        @NotBlank(message = "Group ID is required")
        private String groupId;

        private String paidByEmail;
        private String description;
        private String notes;
        private List<ItemRequest> items;
    }

    @Data
    public static class NaturalLanguageRequest {
        @NotBlank(message = "Text is required")
        private String text;

        @NotBlank(message = "Group ID is required")
        private String groupId;
    }

    @Data
    public static class ItemRequest {
        @NotBlank(message = "Item name is required")
        private String itemName;

        @NotNull(message = "Price is required")
        private Double price;

        private Integer quantity = 1;
        private String assignedToEmail;
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
        private String assignedTo;
        private String assignedToEmail;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExpenseResponse {
        private String id;
        private String title;
        private String description;
        private Double totalAmount;
        private String expenseType;
        private String paidBy;
        private String paidByEmail;
        private String groupId;
        private String groupName;
        private List<ItemResponse> items;
        private String notes;
        private LocalDateTime createdAt;
        private int splitCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AiExtractedExpense {
        private String title;
        private Double totalAmount;
        private List<ItemResponse> items;
        private String rawText;
    }
}