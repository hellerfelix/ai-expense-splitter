package helix.example.demo.group;

import helix.example.demo.auth.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface GroupRepository extends JpaRepository<Group, UUID> {

    // Find all groups where user is creator OR member
    @Query("SELECT g FROM Group g WHERE g.createdBy = :user OR :user MEMBER OF g.members")
    List<Group> findAllGroupsByUser(User user);
}