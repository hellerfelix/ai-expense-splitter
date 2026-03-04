package helix.example.demo.split;

import helix.example.demo.auth.User;
import helix.example.demo.group.Group;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SplitRepository extends JpaRepository<Split, UUID> {

    // Get all splits for an expense
    List<Split> findByExpenseId(UUID expenseId);

    // Get all unsettled splits for a group
    List<Split> findByGroupAndSettled(Group group, Boolean settled);

    // Get all splits where user owes money in a group
    List<Split> findByGroupAndOwesByAndSettled(
            Group group, User owesBy, Boolean settled);

    // Get all splits where money is owed to user in a group
    List<Split> findByGroupAndOwesToAndSettled(
            Group group, User owesTo, Boolean settled);

    // Get all splits for a user in a group (both directions)
    @Query("SELECT s FROM Split s WHERE s.group = :group " +
            "AND (s.owesBy = :user OR s.owesTo = :user)")
    List<Split> findAllUserSplitsInGroup(Group group, User user);

    // Check if expense already split
    boolean existsByExpenseId(UUID expenseId);
}