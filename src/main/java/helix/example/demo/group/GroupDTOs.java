package helix.example.demo.group;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

public class GroupDTOs {

    // ---------- REQUEST DTOs ----------

    @Data
    public static class CreateGroupRequest {
        @NotBlank(message = "Group name is required")
        private String name;
        private String description;
    }

    @Data
    public static class AddMemberRequest {
        @NotBlank(message = "Email is required")
        private String email;
    }

    // ---------- RESPONSE DTOs ----------

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MemberResponse {
        private String id;
        private String name;
        private String email;
        private String upiId;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GroupResponse {
        private String id;
        private String name;
        private String description;
        private String createdBy;
        private List<MemberResponse> members;
        private int totalMembers;
        private LocalDateTime createdAt;
    }
}