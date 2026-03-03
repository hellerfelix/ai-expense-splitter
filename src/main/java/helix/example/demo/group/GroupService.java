package helix.example.demo.group;

import helix.example.demo.auth.User;
import helix.example.demo.auth.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GroupService {

    private final GroupRepository groupRepository;
    private final UserRepository userRepository;

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
        List<Group> groups = groupRepository.findAllGroupsByUser(user);
        return groups.stream()
                .map(this::mapToGroupResponse)
                .collect(Collectors.toList());
    }

    // Get single group by ID
    public GroupDTOs.GroupResponse getGroupById(String groupId, String userEmail) {
        Group group = groupRepository.findById(UUID.fromString(groupId))
                .orElseThrow(() -> new RuntimeException("Group not found"));

        // Check if user is a member
        User user = getUserByEmail(userEmail);
        boolean isMember = group.getMembers().contains(user);
        boolean isCreator = group.getCreatedBy().equals(user);

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
        User requester = getUserByEmail(requesterEmail);
        if (!group.getCreatedBy().getEmail().equals(requesterEmail)) {
            throw new RuntimeException("Only group creator can add members");
        }

        // Find user to add
        User newMember = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException(
                        "No user found with email: " + request.getEmail() +
                                ". Ask them to register first."));

        // Check if already a member
        if (group.getMembers().contains(newMember)) {
            throw new RuntimeException("User is already a member of this group");
        }

        group.getMembers().add(newMember);
        Group saved = groupRepository.save(group);

        return mapToGroupResponse(saved);
    }

    // ---------- HELPER METHODS ----------

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
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