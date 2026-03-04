package helix.example.demo.split;

import helix.example.demo.auth.User;
import helix.example.demo.auth.UserRepository;
import helix.example.demo.expense.Expense;
import helix.example.demo.expense.ExpenseItem;
import helix.example.demo.expense.ExpenseRepository;
import helix.example.demo.group.Group;
import helix.example.demo.group.GroupRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SplitService {

    private final SplitRepository splitRepository;
    private final ExpenseRepository expenseRepository;
    private final GroupRepository groupRepository;
    private final UserRepository userRepository;

    // ─── 1. Equal Split ───────────────────────────────────────────────────
    // Splits expense equally among all group members

    @Transactional
    public List<SplitDTOs.SplitResponse> splitEqually(
            String expenseId, String userEmail) {

        Expense expense = getExpenseById(expenseId);
        validateExpenseOwner(expense, userEmail);

        // Check if already split
        if (splitRepository.existsByExpenseId(expense.getId())) {
            throw new RuntimeException(
                    "This expense has already been split. Delete existing split first.");
        }

        Group group = expense.getGroup();
        List<User> members = group.getMembers();
        User paidBy = expense.getPaidBy();

        // Calculate each person's share
        double totalAmount = expense.getTotalAmount();
        double sharePerPerson = Math.round(
                (totalAmount / members.size()) * 100.0) / 100.0;

        List<Split> splits = new ArrayList<>();

        for (User member : members) {
            // Skip the person who paid
            if (member.getId().equals(paidBy.getId())) continue;

            Split split = Split.builder()
                    .owesBy(member)
                    .owesTo(paidBy)
                    .amount(sharePerPerson)
                    .expense(expense)
                    .group(group)
                    .settled(false)
                    .build();

            splits.add(split);
        }

        List<Split> saved = splitRepository.saveAll(splits);
        return saved.stream()
                .map(this::mapToSplitResponse)
                .collect(Collectors.toList());
    }

    // ─── 2. Item Wise Split ───────────────────────────────────────────────
    // Splits expense based on who ordered what

    @Transactional
    public List<SplitDTOs.SplitResponse> splitByItems(
            String expenseId, String userEmail) {

        Expense expense = getExpenseById(expenseId);
        validateExpenseOwner(expense, userEmail);

        // Check if already split
        if (splitRepository.existsByExpenseId(expense.getId())) {
            throw new RuntimeException(
                    "This expense has already been split.");
        }

        // Check all items are assigned
        List<ExpenseItem> items = expense.getItems();
        boolean allAssigned = items.stream()
                .allMatch(item -> item.getAssignedTo() != null);

        if (!allAssigned) {
            throw new RuntimeException(
                    "Please assign all items to people before splitting by items.");
        }

        User paidBy = expense.getPaidBy();
        Group group = expense.getGroup();

        // Calculate how much each person owes
        Map<User, Double> amountPerPerson = new HashMap<>();

        for (ExpenseItem item : items) {
            User assignedTo = item.getAssignedTo();

            // Skip if item assigned to person who paid
            if (assignedTo.getId().equals(paidBy.getId())) continue;

            double itemTotal = item.getPrice() * item.getQuantity();
            amountPerPerson.merge(assignedTo, itemTotal, Double::sum);
        }

        // Create splits
        List<Split> splits = new ArrayList<>();
        for (Map.Entry<User, Double> entry : amountPerPerson.entrySet()) {
            Split split = Split.builder()
                    .owesBy(entry.getKey())
                    .owesTo(paidBy)
                    .amount(Math.round(entry.getValue() * 100.0) / 100.0)
                    .expense(expense)
                    .group(group)
                    .settled(false)
                    .build();
            splits.add(split);
        }

        List<Split> saved = splitRepository.saveAll(splits);
        return saved.stream()
                .map(this::mapToSplitResponse)
                .collect(Collectors.toList());
    }

    // ─── 3. Get Group Balances ────────────────────────────────────────────
    // Shows who owes whom in the group

    public SplitDTOs.GroupBalanceSummary getGroupBalances(
            String groupId, String userEmail) {

        Group group = getGroupById(groupId);

        // Get all unsettled splits in group
        List<Split> unsettledSplits = splitRepository
                .findByGroupAndSettled(group, false);

        // Group splits by owesBy -> owesTo pair
        Map<String, List<Split>> splitsByPair = unsettledSplits.stream()
                .collect(Collectors.groupingBy(s ->
                        s.getOwesBy().getId() + "-" + s.getOwesTo().getId()));

        List<SplitDTOs.BalanceResponse> balances = new ArrayList<>();

        for (Map.Entry<String, List<Split>> entry : splitsByPair.entrySet()) {
            List<Split> pairSplits = entry.getValue();
            Split first = pairSplits.get(0);

            // Sum up total amount for this pair
            double totalAmount = pairSplits.stream()
                    .mapToDouble(Split::getAmount)
                    .sum();
            totalAmount = Math.round(totalAmount * 100.0) / 100.0;

            List<SplitDTOs.SplitResponse> splitResponses = pairSplits.stream()
                    .map(this::mapToSplitResponse)
                    .collect(Collectors.toList());

            balances.add(SplitDTOs.BalanceResponse.builder()
                    .owesBy(first.getOwesBy().getName())
                    .owesByEmail(first.getOwesBy().getEmail())
                    .owesTo(first.getOwesTo().getName())
                    .owesToEmail(first.getOwesTo().getEmail())
                    .totalAmount(totalAmount)
                    .splits(splitResponses)
                    .build());
        }

        // Calculate total unsettled amount in group
        double totalUnsettled = balances.stream()
                .mapToDouble(SplitDTOs.BalanceResponse::getTotalAmount)
                .sum();
        totalUnsettled = Math.round(totalUnsettled * 100.0) / 100.0;

        return SplitDTOs.GroupBalanceSummary.builder()
                .groupId(groupId)
                .groupName(group.getName())
                .balances(balances)
                .totalUnsettled(totalUnsettled)
                .build();
    }

    // ─── 4. Settle a Split ────────────────────────────────────────────────

    @Transactional
    public SplitDTOs.SplitResponse settleSplit(
            SplitDTOs.SettleRequest request, String userEmail) {

        Split split = splitRepository.findById(UUID.fromString(request.getSplitId()))
                .orElseThrow(() -> new RuntimeException("Split not found"));

        // Only person who owes can settle
        if (!split.getOwesBy().getEmail().equals(userEmail)) {
            throw new RuntimeException(
                    "Only the person who owes can mark this as settled");
        }

        if (split.getSettled()) {
            throw new RuntimeException("This split is already settled");
        }

        split.setSettled(true);
        split.setSettledAt(LocalDateTime.now());

        Split saved = splitRepository.save(split);
        return mapToSplitResponse(saved);
    }

    // ─── 5. Get Expense Splits ────────────────────────────────────────────

    public List<SplitDTOs.SplitResponse> getExpenseSplits(String expenseId) {
        List<Split> splits = splitRepository
                .findByExpenseId(UUID.fromString(expenseId));
        return splits.stream()
                .map(this::mapToSplitResponse)
                .collect(Collectors.toList());
    }

    // ─── HELPER METHODS ───────────────────────────────────────────────────

    private Expense getExpenseById(String expenseId) {
        return expenseRepository.findById(UUID.fromString(expenseId))
                .orElseThrow(() -> new RuntimeException("Expense not found"));
    }

    private Group getGroupById(String groupId) {
        return groupRepository.findById(UUID.fromString(groupId))
                .orElseThrow(() -> new RuntimeException("Group not found"));
    }

    private void validateExpenseOwner(Expense expense, String userEmail) {
        boolean isPaidBy = expense.getPaidBy().getEmail().equals(userEmail);
        boolean isCreatedBy = expense.getCreatedBy().getEmail().equals(userEmail);

        if (!isPaidBy && !isCreatedBy) {
            throw new RuntimeException(
                    "Only the person who paid or created this expense can split it");
        }
    }

    private SplitDTOs.SplitResponse mapToSplitResponse(Split split) {
        return SplitDTOs.SplitResponse.builder()
                .id(split.getId().toString())
                .owesBy(split.getOwesBy().getName())
                .owesByEmail(split.getOwesBy().getEmail())
                .owesTo(split.getOwesTo().getName())
                .owesToEmail(split.getOwesTo().getEmail())
                .amount(split.getAmount())
                .settled(split.getSettled())
                .expenseTitle(split.getExpense().getTitle())
                .groupName(split.getGroup().getName())
                .createdAt(split.getCreatedAt())
                .settledAt(split.getSettledAt())
                .build();
    }
}