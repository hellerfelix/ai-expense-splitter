package helix.example.demo.expense;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/expenses")
@RequiredArgsConstructor
@Tag(name = "Expenses", description = "Expense management APIs")
@SecurityRequirement(name = "bearerAuth")
public class ExpenseController {

    private final ExpenseService expenseService;

    // ─── 1. Manual Entry ──────────────────────────────────────────────────

    @PostMapping("/manual")
    @Operation(summary = "Add expense manually")
    public ResponseEntity<ExpenseDTOs.ExpenseResponse> createManualExpense(
            @Valid @RequestBody ExpenseDTOs.ManualExpenseRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(
                expenseService.createManualExpense(request, userDetails.getUsername()));
    }

    // ─── 2. Natural Language ──────────────────────────────────────────────

    @PostMapping("/natural")
    @Operation(summary = "Extract expense from natural language text")
    public ResponseEntity<ExpenseDTOs.AiExtractedExpense> extractFromNaturalLanguage(
            @Valid @RequestBody ExpenseDTOs.NaturalLanguageRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(
                expenseService.extractFromNaturalLanguage(request, userDetails.getUsername()));
    }

    // ─── 3. Receipt Upload ────────────────────────────────────────────────

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload receipt image and extract items using AI")
    public ResponseEntity<ExpenseDTOs.AiExtractedExpense> uploadReceipt(
            @RequestParam("file") MultipartFile file,
            @RequestParam("groupId") String groupId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(
                expenseService.extractFromReceipt(file, groupId, userDetails.getUsername()));
    }

    // ─── 4. Save AI Extracted Expense ────────────────────────────────────

    @PostMapping("/save-ai")
    @Operation(summary = "Save AI extracted expense after user reviews it")
    public ResponseEntity<ExpenseDTOs.ExpenseResponse> saveAiExpense(
            @Valid @RequestBody ExpenseDTOs.ManualExpenseRequest request,
            @RequestParam String type,
            @AuthenticationPrincipal UserDetails userDetails) {
        Expense.ExpenseType expenseType = type.equals("RECEIPT_UPLOAD")
                ? Expense.ExpenseType.RECEIPT_UPLOAD
                : Expense.ExpenseType.NATURAL_LANGUAGE;
        return ResponseEntity.ok(
                expenseService.saveAiExtractedExpense(
                        request, userDetails.getUsername(), expenseType));
    }

    // ─── 5. Get Group Expenses (PAGINATED) ───────────────────────────────

    @GetMapping("/group/{groupId}")
    @Operation(summary = "Get paginated expenses for a group")
    public ResponseEntity<Map<String, Object>> getGroupExpenses(
            @PathVariable String groupId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(
                expenseService.getGroupExpenses(
                        groupId, userDetails.getUsername(), page, size));
    }

    // ─── 6. Update Expense ────────────────────────────────────────────────

    @PutMapping("/{id}")
    @Operation(summary = "Edit an expense")
    public ResponseEntity<ExpenseDTOs.ExpenseResponse> updateExpense(
            @PathVariable String id,
            @RequestBody ExpenseDTOs.ManualExpenseRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(
                expenseService.updateExpense(id, request, userDetails.getUsername()));
    }

    // ─── 7. Delete Expense ────────────────────────────────────────────────

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete an expense")
    public ResponseEntity<Void> deleteExpense(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetails userDetails) {
        expenseService.deleteExpense(id, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    // ─── 8. Recent Expenses ───────────────────────────────────────────────

    @GetMapping("/recent")
    @Operation(summary = "Get recent expenses across all user groups")
    public ResponseEntity<List<ExpenseDTOs.ExpenseResponse>> getRecentExpenses(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(
                expenseService.getRecentExpenses(userDetails.getUsername()));
    }
}