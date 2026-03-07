package helix.example.demo.group;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
@Tag(name = "Groups", description = "Group management APIs")
@SecurityRequirement(name = "bearerAuth")
public class GroupController {

    private final GroupService groupService;

    // POST /api/groups — Create group
    @PostMapping
    @Operation(summary = "Create a new group")
    public ResponseEntity<GroupDTOs.GroupResponse> createGroup(
            @Valid @RequestBody GroupDTOs.CreateGroupRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        GroupDTOs.GroupResponse response = groupService.createGroup(
                request, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    // GET /api/groups — Get my groups
    @GetMapping
    @Operation(summary = "Get all my groups")
    public ResponseEntity<List<GroupDTOs.GroupResponse>> getMyGroups(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        List<GroupDTOs.GroupResponse> groups = groupService.getMyGroups(
                userDetails.getUsername());
        return ResponseEntity.ok(groups);
    }

    // GET /api/groups/{id} — Get single group
    @GetMapping("/{id}")
    @Operation(summary = "Get group by ID")
    public ResponseEntity<GroupDTOs.GroupResponse> getGroupById(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        GroupDTOs.GroupResponse response = groupService.getGroupById(
                id, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    // POST /api/groups/{id}/members — Add member
    @PostMapping("/{id}/members")
    @Operation(summary = "Add member to group")
    public ResponseEntity<GroupDTOs.GroupResponse> addMember(
            @PathVariable String id,
            @Valid @RequestBody GroupDTOs.AddMemberRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        GroupDTOs.GroupResponse response = groupService.addMember(
                id, request, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }
    @PutMapping("/{id}")
    @Operation(summary = "Update group name and description")
    public ResponseEntity<GroupDTOs.GroupResponse> updateGroup(
            @PathVariable String id,
            @RequestBody GroupDTOs.CreateGroupRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(
                groupService.updateGroup(id, request, userDetails.getUsername()));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a group")
    public ResponseEntity<Void> deleteGroup(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetails userDetails) {
        groupService.deleteGroup(id, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}