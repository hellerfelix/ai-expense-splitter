package helix.example.demo.expense;

import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, UUID> {

    // Original — still used by getRecentExpenses in ExpenseService
    List<Expense> findByGroupIdOrderByCreatedAtDesc(UUID groupId);

    // NEW — paginated version for getGroupExpenses
    Page<Expense> findByGroupIdOrderByCreatedAtDesc(UUID groupId, Pageable pageable);

    @Modifying
    @Transactional
    void deleteByGroupId(UUID groupId);
}