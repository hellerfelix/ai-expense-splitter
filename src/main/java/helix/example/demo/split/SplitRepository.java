package helix.example.demo.split;

import helix.example.demo.expense.Expense;
import helix.example.demo.group.Group;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SplitRepository extends JpaRepository<Split, UUID> {
    List<Split> findByGroupAndSettled(Group group, boolean settled);
    List<Split> findByGroup(Group group);
    int countByExpense(Expense expense);
    boolean existsByExpense(Expense expense);
    List<Split> findByExpense(Expense expense);
}