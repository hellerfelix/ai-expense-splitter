package helix.example.demo.expense;

import helix.example.demo.ai.AiService;
import helix.example.demo.auth.User;
import helix.example.demo.auth.UserRepository;
import helix.example.demo.group.Group;
import helix.example.demo.group.GroupRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
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

    // ─── 1. Manual Expense Entry ──────────────────────────────────────────

    public ExpenseDTOs.ExpenseResponse createManualExpense(
            ExpenseDTOs.ManualExpenseRequest request, String userEmail) {

        User loggedInUser = getUserByEmail(userEmail);
        Group group = getGroupById(request.getGroupId());

        // Any member can add expense — not just creator
        validateUserInGroup(loggedInUser, group);

        // Who paid — if not specified, logged in user paid
        User paidBy;
        if (request.getPaidByEmail() != null && !request.getPaidByEmail().isEmpty()) {
            paidBy = userRepository.findByEmail(request.getPaidByEmail())
                    .orElseThrow(() -> new RuntimeException(
                            "User not found with email: " + request.getPaidByEmail()));
            // Make sure paidBy person is also in the group
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

        // Add items if provided
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
        return mapToExpenseResponse(saved);
    }

    // ─── 2. Natural Language Expense Entry ───────────────────────────────

    public ExpenseDTOs.AiExtractedExpense extractFromNaturalLanguage(
            ExpenseDTOs.NaturalLanguageRequest request, String userEmail) {

        // Validate user and group first
        User user = getUserByEmail(userEmail);
        Group group = getGroupById(request.getGroupId());
        validateUserInGroup(user, group);

        // Call AI to extract expense details
        return aiService.extractFromNaturalLanguage(request.getText());
    }

    // ─── 3. Receipt Upload ────────────────────────────────────────────────

    public ExpenseDTOs.AiExtractedExpense extractFromReceipt(
            MultipartFile file, String groupId, String userEmail) {

        // Validate file
        if (file.isEmpty()) {
            throw new RuntimeException("Please upload a valid image file");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new RuntimeException(
                    "Invalid file type. Please upload an image (JPG, PNG)");
        }

        // Validate user and group
        User user = getUserByEmail(userEmail);
        Group group = getGroupById(groupId);
        validateUserInGroup(user, group);

        // Call AI to extract from receipt
        return aiService.extractFromReceipt(file);
    }

    // ─── 4. Save AI Extracted Expense ────────────────────────────────────
    // Called after user reviews and confirms AI extracted items

    public ExpenseDTOs.ExpenseResponse saveAiExtractedExpense(
            ExpenseDTOs.ManualExpenseRequest request,
            String userEmail,
            Expense.ExpenseType type) {

        User paidBy = getUserByEmail(userEmail);
        Group group = getGroupById(request.getGroupId());
        validateUserInGroup(paidBy, group);

        Expense expense = Expense.builder()
                .title(request.getTitle())
                .totalAmount(request.getTotalAmount())
                .expenseType(type)
                .paidBy(paidBy)
                .createdBy(paidBy)
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
        return mapToExpenseResponse(saved);
    }

    // ─── 5. Get Group Expenses ────────────────────────────────────────────

    public List<ExpenseDTOs.ExpenseResponse> getGroupExpenses(
            String groupId, String userEmail) {

        User user = getUserByEmail(userEmail);
        Group group = getGroupById(groupId);
        validateUserInGroup(user, group);

        List<Expense> expenses = expenseRepository
                .findByGroupIdOrderByCreatedAtDesc(UUID.fromString(groupId));

        return expenses.stream()
                .map(this::mapToExpenseResponse)
                .collect(Collectors.toList());
    }

    // ─── 6. Delete Expense ────────────────────────────────────────────────

    public void deleteExpense(String expenseId, String userEmail) {
        Expense expense = expenseRepository.findById(UUID.fromString(expenseId))
                .orElseThrow(() -> new RuntimeException("Expense not found"));

        // Only person who paid can delete
        if (!expense.getPaidBy().getEmail().equals(userEmail)) {
            throw new RuntimeException("Only the person who paid can delete this expense");
        }

        expenseRepository.delete(expense);
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
                .build();
    }
}