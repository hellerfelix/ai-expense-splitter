package helix.example.demo.split;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

public class SplitDTOs {

    // ---------- REQUEST DTOs ----------

    @Data
    public static class SettleRequest {
        @NotBlank(message = "Split ID is required")
        private String splitId;
    }

    // ---------- RESPONSE DTOs ----------

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SplitResponse {
        private String id;
        private String owesBy;        // person who owes
        private String owesByEmail;
        private String owesTo;        // person who is owed
        private String owesToEmail;
        private Double amount;
        private Boolean settled;
        private String expenseTitle;
        private String groupName;
        private LocalDateTime createdAt;
        private LocalDateTime settledAt;
    }

    // Balance between two people
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BalanceResponse {
        private String owesBy;
        private String owesByEmail;
        private String owesTo;
        private String owesToEmail;
        private Double totalAmount;   // total unsettled amount
        private List<SplitResponse> splits; // individual splits making up this balance
    }

    // Full group balance summary
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GroupBalanceSummary {
        private String groupId;
        private String groupName;
        private List<BalanceResponse> balances; // all balances in group
        private Double totalUnsettled;          // total money unsettled in group
    }
    @Data
    public static class CustomSplitRequest {
        private List<String> memberEmails; // emails to split among
    }
}
