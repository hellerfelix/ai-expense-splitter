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

    @Transactional
    public List<SplitDTOs.SplitResponse> splitEqually(
            String expenseId, String userEmail) {

        Expense expense = getExpenseById(expenseId);
        validateExpenseOwner(expense, userEmail);

        // Check if already split
        if (splitRepository.existsByExpense(expense)) {
            throw new RuntimeException(
                    "This expense has already been split.");
        }

        Group group = expense.getGroup();
        List<User> members = group.getMembers();
        User paidBy = expense.getPaidBy();

        double totalAmount = expense.getTotalAmount();
        double sharePerPerson = Math.round(
                (totalAmount / members.size()) * 100.0) / 100.0;

        List<Split> splits = new ArrayList<>();

        for (User member : members) {
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

    @Transactional
    public List<SplitDTOs.SplitResponse> splitByItems(
            String expenseId, String userEmail) {

        Expense expense = getExpenseById(expenseId);
        validateExpenseOwner(expense, userEmail);

        if (splitRepository.existsByExpense(expense)) {
            throw new RuntimeException(
                    "This expense has already been split.");
        }

        List<ExpenseItem> items = expense.getItems();
        boolean allAssigned = items.stream()
                .allMatch(item -> item.getAssignedTo() != null);

        if (!allAssigned) {
            throw new RuntimeException(
                    "Please assign all items to people before splitting by items.");
        }

        User paidBy = expense.getPaidBy();
        Group group = expense.getGroup();

        Map<User, Double> amountPerPerson = new HashMap<>();

        for (ExpenseItem item : items) {
            User assignedTo = item.getAssignedTo();
            if (assignedTo.getId().equals(paidBy.getId())) continue;
            double itemTotal = item.getPrice() * item.getQuantity();
            amountPerPerson.merge(assignedTo, itemTotal, Double::sum);
        }

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

    public SplitDTOs.GroupBalanceSummary getGroupBalances(
            String groupId, String userEmail) {

        Group group = getGroupById(groupId);
        List<Split> unsettledSplits = splitRepository
                .findByGroupAndSettled(group, false);

        Map<String, Double> netBalances = new HashMap<>();
        Map<String, List<Split>> splitsByKey = new HashMap<>();

        for (Split split : unsettledSplits) {
            String emailA = split.getOwesBy().getEmail();
            String emailB = split.getOwesTo().getEmail();

            String key = emailA.compareTo(emailB) < 0
                    ? emailA + ":" + emailB
                    : emailB + ":" + emailA;

            double direction = emailA.compareTo(emailB) < 0
                    ? split.getAmount()
                    : -split.getAmount();

            netBalances.merge(key, direction, Double::sum);
            splitsByKey.computeIfAbsent(key, k -> new ArrayList<>()).add(split);
        }

        List<SplitDTOs.BalanceResponse> balances = new ArrayList<>();

        for (Map.Entry<String, Double> entry : netBalances.entrySet()) {
            double netAmount = entry.getValue();
            if (Math.abs(netAmount) < 0.01) continue;

            String[] emails = entry.getKey().split(":");
            String owesByEmail, owesToEmail;

            if (netAmount > 0) {
                owesByEmail = emails[0];
                owesToEmail = emails[1];
            } else {
                owesByEmail = emails[1];
                owesToEmail = emails[0];
                netAmount = -netAmount;
            }

            User owesBy = userRepository.findByEmail(owesByEmail)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            User owesTo = userRepository.findByEmail(owesToEmail)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            List<SplitDTOs.SplitResponse> splitResponses = splitsByKey
                    .get(entry.getKey()).stream()
                    .map(this::mapToSplitResponse)
                    .collect(Collectors.toList());

            balances.add(SplitDTOs.BalanceResponse.builder()
                    .owesBy(owesBy.getName())
                    .owesByEmail(owesByEmail)
                    .owesTo(owesTo.getName())
                    .owesToEmail(owesToEmail)
                    .totalAmount(Math.round(netAmount * 100.0) / 100.0)
                    .splits(splitResponses)
                    .build());
        }

        double totalUnsettled = balances.stream()
                .mapToDouble(SplitDTOs.BalanceResponse::getTotalAmount)
                .sum();

        return SplitDTOs.GroupBalanceSummary.builder()
                .groupId(groupId)
                .groupName(group.getName())
                .balances(balances)
                .totalUnsettled(Math.round(totalUnsettled * 100.0) / 100.0)
                .build();
    }

    // ─── 4. Settle a Split ────────────────────────────────────────────────

    @Transactional
    public SplitDTOs.SplitResponse settleSplit(
            SplitDTOs.SettleRequest request, String userEmail) {

        Split split = splitRepository.findById(UUID.fromString(request.getSplitId()))
                .orElseThrow(() -> new RuntimeException("Split not found"));

        if (!split.getOwesBy().getEmail().equals(userEmail) &&
                !split.getOwesTo().getEmail().equals(userEmail)) {
            throw new RuntimeException(
                    "Only members involved in this split can settle it");
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
        Expense expense = getExpenseById(expenseId);
        List<Split> splits = splitRepository.findByExpense(expense);
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