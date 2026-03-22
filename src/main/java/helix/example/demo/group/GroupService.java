package helix.example.demo.group;

import helix.example.demo.auth.User;
import helix.example.demo.auth.UserRepository;
import helix.example.demo.expense.ExpenseRepository;
import helix.example.demo.split.SplitRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GroupService {

    private final GroupRepository groupRepository;
    private final UserRepository userRepository;
    private final ExpenseRepository expenseRepository;
    private final SplitRepository splitRepository;

    // Create a new group
    public GroupDTOs.GroupResponse createGroup(
            GroupDTOs.CreateGroupRequest request, String creatorEmail) {

        User creator = getUserByEmail(creatorEmail);

        Group group = Group.builder()
                .name(request.getName())
                .description(request.getDescription())
                .createdBy(creator)
                .build();

        // Creator is automatically a member
        group.getMembers().add(creator);
        Group saved = groupRepository.save(group);

        return mapToGroupResponse(saved);
    }

    // Get all groups for current user
    public List<GroupDTOs.GroupResponse> getMyGroups(String userEmail) {
        User user = getUserByEmail(userEmail);
        List<Group> groups = groupRepository.findGroupsByMember(user);
        return groups.stream()
                .map(this::mapToGroupResponse)
                .collect(Collectors.toList());
    }

    // Get single group by ID
    public GroupDTOs.GroupResponse getGroupById(String groupId, String userEmail) {
        Group group = groupRepository.findById(UUID.fromString(groupId))
                .orElseThrow(() -> new RuntimeException("Group not found"));

        User user = getUserByEmail(userEmail);
        boolean isMember = group.getMembers().stream()
                .anyMatch(m -> m.getId().equals(user.getId()));
        boolean isCreator = group.getCreatedBy().getId().equals(user.getId());

        if (!isMember && !isCreator) {
            throw new RuntimeException("You are not a member of this group");
        }

        return mapToGroupResponse(group);
    }

    // Add member to group
    public GroupDTOs.GroupResponse addMember(
            String groupId, GroupDTOs.AddMemberRequest request, String requesterEmail) {

        Group group = groupRepository.findById(UUID.fromString(groupId))
                .orElseThrow(() -> new RuntimeException("Group not found"));

        // Only creator can add members
        if (!group.getCreatedBy().getEmail().equals(requesterEmail)) {
            throw new RuntimeException("Only group creator can add members");
        }

        // Find user to add
        User newMember = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException(
                        "No user found with email: " + request.getEmail() +
                                ". Ask them to register first."));

        // FIX: use stream with getId() instead of .contains() for reliable check
        boolean alreadyMember = group.getMembers().stream()
                .anyMatch(m -> m.getId().equals(newMember.getId()));
        if (alreadyMember) {
            throw new RuntimeException("User is already a member of this group");
        }

        group.getMembers().add(newMember);
        Group saved = groupRepository.save(group);

        return mapToGroupResponse(saved);
    }

    // Update group details
    public GroupDTOs.GroupResponse updateGroup(
            String groupId,
            GroupDTOs.CreateGroupRequest request,
            String userEmail) {

        Group group = groupRepository.findById(UUID.fromString(groupId))
                .orElseThrow(() -> new RuntimeException("Group not found"));

        if (!group.getCreatedBy().getEmail().equals(userEmail)) {
            throw new RuntimeException("Only the group creator can edit this group");
        }

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            group.setName(request.getName());
        }
        if (request.getDescription() != null) {
            group.setDescription(request.getDescription());
        }

        return mapToGroupResponse(groupRepository.save(group));
    }

    // Delete group — must remove splits and expenses first due to FK constraints
    @Transactional
    public void deleteGroup(String groupId, String userEmail) {
        Group group = groupRepository.findById(UUID.fromString(groupId))
                .orElseThrow(() -> new RuntimeException("Group not found"));

        if (!group.getCreatedBy().getEmail().equals(userEmail)) {
            throw new RuntimeException("Only the group creator can delete this group");
        }

        UUID gid = UUID.fromString(groupId);

        // 1. Delete all splits (has direct FK to both group_id AND expense_id)
        splitRepository.deleteByGroupId(gid);

        // 2. Delete all expenses
        expenseRepository.deleteByGroupId(gid);

        // 3. Delete the group (JPA auto-clears group_members join table)
        groupRepository.delete(group);
    }

    // Generate invite link for a group
    public GroupDTOs.InviteLinkResponse generateInviteLink(String groupId, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Group group = groupRepository.findById(UUID.fromString(groupId))
                .orElseThrow(() -> new RuntimeException("Group not found"));
        validateUserInGroup(user, group);

        String token = UUID.randomUUID().toString().replace("-", "");
        group.setInviteToken(token);
        group.setInviteExpiry(LocalDateTime.now().plusHours(24));
        groupRepository.save(group);

        GroupDTOs.InviteLinkResponse response = new GroupDTOs.InviteLinkResponse();
        response.setInviteLink("http://localhost:3000/join/" + token);
        response.setExpiresAt(group.getInviteExpiry());
        return response;
    }

    // Join group via invite link — FIX 3: token invalidated after use
    public void joinByInviteLink(String token, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Group group = groupRepository.findByInviteToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid invite link"));

        if (group.getInviteExpiry() == null ||
                group.getInviteExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Invite link has expired");
        }

        // FIX: use stream with getId() instead of .contains() for reliable check
        boolean alreadyMember = group.getMembers().stream()
                .anyMatch(m -> m.getId().equals(user.getId()));
        if (alreadyMember) {
            throw new RuntimeException("You are already a member of this group");
        }

        group.getMembers().add(user);

        // FIX 3: invalidate token after single use
        group.setInviteToken(null);
        group.setInviteExpiry(null);

        groupRepository.save(group);
    }

    // ---------- HELPER METHODS ----------

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private void validateUserInGroup(User user, Group group) {
        boolean isMember = group.getMembers().stream()
                .anyMatch(m -> m.getId().equals(user.getId()));
        boolean isCreator = group.getCreatedBy().getId().equals(user.getId());
        if (!isMember && !isCreator) {
            throw new RuntimeException("You are not a member of this group");
        }
    }

    private GroupDTOs.GroupResponse mapToGroupResponse(Group group) {
        List<GroupDTOs.MemberResponse> members = group.getMembers().stream()
                .map(m -> GroupDTOs.MemberResponse.builder()
                        .id(m.getId().toString())
                        .name(m.getName())
                        .email(m.getEmail())
                        .upiId(m.getUpiId())
                        .build())
                .collect(Collectors.toList());

        return GroupDTOs.GroupResponse.builder()
                .id(group.getId().toString())
                .name(group.getName())
                .description(group.getDescription())
                .createdBy(group.getCreatedBy().getName())
                .members(members)
                .totalMembers(members.size())
                .createdAt(group.getCreatedAt())
                .build();
    }
}