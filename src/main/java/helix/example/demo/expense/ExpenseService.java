package helix.example.demo.expense;

import helix.example.demo.ai.AiService;
import helix.example.demo.auth.User;
import helix.example.demo.auth.UserRepository;
import helix.example.demo.email.EmailService;
import helix.example.demo.group.Group;
import helix.example.demo.group.GroupRepository;
import helix.example.demo.split.Split;
import helix.example.demo.split.SplitRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;
    private final GroupRepository groupRepository;
    private final AiService aiService;
    private final SplitRepository splitRepository;
    private final EmailService emailService;

    // ─── 1. Manual Expense Entry ──────────────────────────────────────────

    public ExpenseDTOs.ExpenseResponse createManualExpense(
            ExpenseDTOs.ManualExpenseRequest request, String userEmail) {

        User loggedInUser = getUserByEmail(userEmail);
        Group group = getGroupById(request.getGroupId());
        validateUserInGroup(loggedInUser, group);

        User paidBy;
        if (request.getPaidByEmail() != null && !request.getPaidByEmail().isEmpty()) {
            paidBy = userRepository.findByEmail(request.getPaidByEmail())
                    .orElseThrow(() -> new RuntimeException(
                            "User not found with email: " + request.getPaidByEmail()));
            validateUserInGroup(paidBy, group);
        } else {
            paidBy = loggedInUser;
        }

        Expense expense = Expense.builder()
                .title(request.getTitle())
                .totalAmount(request.getTotalAmount())
                .expenseType(Expense.ExpenseType.MANUAL)
                .paidBy(paidBy)
                .createdBy(loggedInUser)
                .group(group)
                .notes(request.getNotes() != null
                        ? request.getNotes() : request.getDescription())
                .build();

        if (request.getItems() != null && !request.getItems().isEmpty()) {
            List<ExpenseItem> items = request.getItems().stream()
                    .map(itemReq -> {
                        ExpenseItem item = ExpenseItem.builder()
                                .itemName(itemReq.getItemName())
                                .price(itemReq.getPrice())
                                .quantity(itemReq.getQuantity() != null
                                        ? itemReq.getQuantity() : 1)
                                .expense(expense)
                                .build();
                        if (itemReq.getAssignedToEmail() != null
                                && !itemReq.getAssignedToEmail().isEmpty()) {
                            userRepository.findByEmail(itemReq.getAssignedToEmail())
                                    .ifPresent(item::setAssignedTo);
                        }
                        return item;
                    })
                    .collect(Collectors.toList());
            expense.setItems(items);
        }

        Expense saved = expenseRepository.save(expense);

        // Send email notifications to all group members except the payer
        List<String> memberEmails = group.getMembers().stream()
                .map(User::getEmail)
                .filter(e -> !e.equals(paidBy.getEmail()))
                .collect(Collectors.toList());

        emailService.sendExpenseNotification(
                memberEmails,
                group.getName(),
                saved.getTitle(),
                saved.getTotalAmount(),
                paidBy.getName()
        );

        return mapToExpenseResponse(saved);
    }

    // ─── 2. Natural Language Expense Entry ───────────────────────────────

    public ExpenseDTOs.AiExtractedExpense extractFromNaturalLanguage(
            ExpenseDTOs.NaturalLanguageRequest request, String userEmail) {

        User user = getUserByEmail(userEmail);
        Group group = getGroupById(request.getGroupId());
        validateUserInGroup(user, group);
        return aiService.extractFromNaturalLanguage(request.getText());
    }

    // ─── 3. Receipt Upload ────────────────────────────────────────────────

    public ExpenseDTOs.AiExtractedExpense extractFromReceipt(
            MultipartFile file, String groupId, String userEmail) {

        if (file.isEmpty()) {
            throw new RuntimeException("Please upload a valid image file");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new RuntimeException(
                    "Invalid file type. Please upload an image (JPG, PNG)");
        }
        User user = getUserByEmail(userEmail);
        Group group = getGroupById(groupId);
        validateUserInGroup(user, group);
        return aiService.extractFromReceipt(file);
    }

    // ─── 4. Save AI Extracted Expense ────────────────────────────────────

    public ExpenseDTOs.ExpenseResponse saveAiExtractedExpense(
            ExpenseDTOs.ManualExpenseRequest request,
            String userEmail,
            Expense.ExpenseType type) {

        User loggedInUser = getUserByEmail(userEmail);
        Group group = getGroupById(request.getGroupId());
        validateUserInGroup(loggedInUser, group);

        User paidBy;
        if (request.getPaidByEmail() != null && !request.getPaidByEmail().isEmpty()) {
            paidBy = userRepository.findByEmail(request.getPaidByEmail())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            validateUserInGroup(paidBy, group);
        } else {
            paidBy = loggedInUser;
        }

        Expense expense = Expense.builder()
                .title(request.getTitle())
                .totalAmount(request.getTotalAmount())
                .expenseType(type)
                .paidBy(paidBy)
                .createdBy(loggedInUser)
                .group(group)
                .notes(request.getNotes())
                .build();

        if (request.getItems() != null && !request.getItems().isEmpty()) {
            List<ExpenseItem> items = request.getItems().stream()
                    .map(itemReq -> {
                        ExpenseItem item = ExpenseItem.builder()
                                .itemName(itemReq.getItemName())
                                .price(itemReq.getPrice())
                                .quantity(itemReq.getQuantity() != null
                                        ? itemReq.getQuantity() : 1)
                                .expense(expense)
                                .build();
                        if (itemReq.getAssignedToEmail() != null
                                && !itemReq.getAssignedToEmail().isEmpty()) {
                            userRepository.findByEmail(itemReq.getAssignedToEmail())
                                    .ifPresent(item::setAssignedTo);
                        }
                        return item;
                    })
                    .collect(Collectors.toList());
            expense.setItems(items);
        }

        Expense saved = expenseRepository.save(expense);

        List<String> memberEmails = group.getMembers().stream()
                .map(User::getEmail)
                .filter(e -> !e.equals(paidBy.getEmail()))
                .collect(Collectors.toList());

        emailService.sendExpenseNotification(
                memberEmails,
                group.getName(),
                saved.getTitle(),
                saved.getTotalAmount(),
                paidBy.getName()
        );

        return mapToExpenseResponse(saved);
    }

    // ─── 5. Get Group Expenses (PAGINATED) ───────────────────────────────

    public Map<String, Object> getGroupExpenses(
            String groupId, String userEmail, int page, int size) {

        User user = getUserByEmail(userEmail);
        Group group = getGroupById(groupId);
        validateUserInGroup(user, group);

        Pageable pageable = PageRequest.of(page, size);
        Page<Expense> expensePage = expenseRepository
                .findByGroupIdOrderByCreatedAtDesc(UUID.fromString(groupId), pageable);

        List<ExpenseDTOs.ExpenseResponse> expenses = expensePage.getContent()
                .stream()
                .map(this::mapToExpenseResponse)
                .collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("expenses", expenses);
        response.put("currentPage", expensePage.getNumber());
        response.put("totalPages", expensePage.getTotalPages());
        response.put("totalExpenses", expensePage.getTotalElements());
        response.put("hasMore", !expensePage.isLast());
        return response;
    }

    // ─── 6. Delete Expense ────────────────────────────────────────────────

    public void deleteExpense(String expenseId, String userEmail) {
        Expense expense = expenseRepository.findById(UUID.fromString(expenseId))
                .orElseThrow(() -> new RuntimeException("Expense not found"));

        validateUserInGroup(getUserByEmail(userEmail), expense.getGroup());

        List<Split> splits = splitRepository.findByExpense(expense);
        if (!splits.isEmpty()) {
            splitRepository.deleteAll(splits);
        }

        expenseRepository.delete(expense);
    }

    // ─── 7. Update Expense ────────────────────────────────────────────────

    public ExpenseDTOs.ExpenseResponse updateExpense(
            String expenseId,
            ExpenseDTOs.ManualExpenseRequest request,
            String userEmail) {

        Expense expense = expenseRepository.findById(UUID.fromString(expenseId))
                .orElseThrow(() -> new RuntimeException("Expense not found"));

        boolean isPaidBy = expense.getPaidBy().getEmail().equals(userEmail);
        boolean isCreatedBy = expense.getCreatedBy().getEmail().equals(userEmail);
        if (!isPaidBy && !isCreatedBy) {
            throw new RuntimeException(
                    "Only the person who paid or created this expense can edit it");
        }

        if (request.getTitle() != null) expense.setTitle(request.getTitle());
        if (request.getTotalAmount() != null) expense.setTotalAmount(request.getTotalAmount());
        if (request.getDescription() != null) expense.setNotes(request.getDescription());

        if (request.getPaidByEmail() != null && !request.getPaidByEmail().isEmpty()) {
            User newPaidBy = userRepository.findByEmail(request.getPaidByEmail())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            validateUserInGroup(newPaidBy, expense.getGroup());
            expense.setPaidBy(newPaidBy);
        }

        Expense saved = expenseRepository.save(expense);

        List<Split> existingSplits = splitRepository.findByExpense(saved);

        if (!existingSplits.isEmpty()) {

            List<Split> settledSplits = existingSplits.stream()
                    .filter(Split::getSettled)
                    .collect(Collectors.toList());

            if (!settledSplits.isEmpty()) {

                Group group = saved.getGroup();
                List<User> members = group.getMembers();
                User paidBy = saved.getPaidBy();
                int memberCount = members.size();

                double settledAmountPerPerson = settledSplits.stream()
                        .mapToDouble(Split::getAmount)
                        .average()
                        .orElse(0);
                double originalSettledTotal = settledAmountPerPerson * memberCount;

                double newSharePerPerson = saved.getTotalAmount() / memberCount;
                double settledSharePerPerson = originalSettledTotal / memberCount;

                double difference = Math.round(
                        (newSharePerPerson - settledSharePerPerson) * 100.0) / 100.0;

                log.info("Edit after settle - settledTotal: {}, newTotal: {}, " +
                                "settledShare: {}, newShare: {}, difference: {}",
                        originalSettledTotal, saved.getTotalAmount(),
                        settledSharePerPerson, newSharePerPerson, difference);

                List<Split> unsettledSplits = existingSplits.stream()
                        .filter(s -> !s.getSettled())
                        .collect(Collectors.toList());
                if (!unsettledSplits.isEmpty()) {
                    splitRepository.deleteAll(unsettledSplits);
                }

                if (difference > 0.01) {
                    List<Split> newSplits = new ArrayList<>();
                    for (User member : members) {
                        if (member.getId().equals(paidBy.getId())) continue;
                        Split split = Split.builder()
                                .owesBy(member)
                                .owesTo(paidBy)
                                .amount(difference)
                                .expense(saved)
                                .group(group)
                                .settled(false)
                                .build();
                        newSplits.add(split);
                    }
                    splitRepository.saveAll(newSplits);

                } else if (difference < -0.01) {
                    double refundPerPerson = Math.round(
                            Math.abs(difference) * 100.0) / 100.0;
                    List<Split> refundSplits = new ArrayList<>();
                    for (User member : members) {
                        if (member.getId().equals(paidBy.getId())) continue;
                        Split split = Split.builder()
                                .owesBy(paidBy)
                                .owesTo(member)
                                .amount(refundPerPerson)
                                .expense(saved)
                                .group(group)
                                .settled(false)
                                .build();
                        refundSplits.add(split);
                    }
                    splitRepository.saveAll(refundSplits);
                }

            } else {
                splitRepository.deleteAll(existingSplits);

                Group group = saved.getGroup();
                List<User> members = group.getMembers();
                User paidBy = saved.getPaidBy();
                double sharePerPerson = Math.round(
                        (saved.getTotalAmount() / members.size()) * 100.0) / 100.0;

                List<Split> newSplits = new ArrayList<>();
                for (User member : members) {
                    if (member.getId().equals(paidBy.getId())) continue;
                    Split split = Split.builder()
                            .owesBy(member)
                            .owesTo(paidBy)
                            .amount(sharePerPerson)
                            .expense(saved)
                            .group(group)
                            .settled(false)
                            .build();
                    newSplits.add(split);
                }
                splitRepository.saveAll(newSplits);
            }
        }

        return mapToExpenseResponse(saved);
    }

    // ─── 8. Get Recent Expenses ───────────────────────────────────────────

    public List<ExpenseDTOs.ExpenseResponse> getRecentExpenses(String userEmail) {
        User user = getUserByEmail(userEmail);
        List<Group> groups = groupRepository.findGroupsByMember(user);

        return groups.stream()
                .flatMap(group -> expenseRepository
                        .findByGroupIdOrderByCreatedAtDesc(group.getId()).stream())
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .limit(8)
                .map(this::mapToExpenseResponse)
                .collect(Collectors.toList());
    }

    // ─── HELPER METHODS ───────────────────────────────────────────────────

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private Group getGroupById(String groupId) {
        return groupRepository.findById(UUID.fromString(groupId))
                .orElseThrow(() -> new RuntimeException("Group not found"));
    }

    private void validateUserInGroup(User user, Group group) {
        boolean isMember = group.getMembers().contains(user);
        boolean isCreator = group.getCreatedBy().equals(user);
        if (!isMember && !isCreator) {
            throw new RuntimeException("You are not a member of this group");
        }
    }

    private ExpenseDTOs.ExpenseResponse mapToExpenseResponse(Expense expense) {
        List<ExpenseDTOs.ItemResponse> items = expense.getItems().stream()
                .map(item -> ExpenseDTOs.ItemResponse.builder()
                        .id(item.getId().toString())
                        .itemName(item.getItemName())
                        .price(item.getPrice())
                        .quantity(item.getQuantity())
                        .assignedTo(item.getAssignedTo() != null
                                ? item.getAssignedTo().getName() : null)
                        .assignedToEmail(item.getAssignedTo() != null
                                ? item.getAssignedTo().getEmail() : null)
                        .build())
                .collect(Collectors.toList());

        return ExpenseDTOs.ExpenseResponse.builder()
                .id(expense.getId().toString())
                .title(expense.getTitle())
                .description(expense.getNotes())
                .totalAmount(expense.getTotalAmount())
                .expenseType(expense.getExpenseType().name())
                .paidBy(expense.getPaidBy().getName())
                .paidByEmail(expense.getPaidBy().getEmail())
                .groupId(expense.getGroup().getId().toString())
                .groupName(expense.getGroup().getName())
                .items(items)
                .notes(expense.getNotes())
                .createdAt(expense.getCreatedAt())
                .splitCount(splitRepository.countByExpense(expense))
                .build();
    }
}