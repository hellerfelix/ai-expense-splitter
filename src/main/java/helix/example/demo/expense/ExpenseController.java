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
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        ExpenseDTOs.ExpenseResponse response = expenseService
                .createManualExpense(request, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    // ─── 2. Natural Language ──────────────────────────────────────────────

    @PostMapping("/natural")
    @Operation(summary = "Extract expense from natural language text")
    public ResponseEntity<ExpenseDTOs.AiExtractedExpense> extractFromNaturalLanguage(
            @Valid @RequestBody ExpenseDTOs.NaturalLanguageRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        ExpenseDTOs.AiExtractedExpense response = expenseService
                .extractFromNaturalLanguage(request, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    // ─── 3. Receipt Upload ────────────────────────────────────────────────

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload receipt image and extract items using AI")
    public ResponseEntity<ExpenseDTOs.AiExtractedExpense> uploadReceipt(
            @RequestParam("file") MultipartFile file,
            @RequestParam("groupId") String groupId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        ExpenseDTOs.AiExtractedExpense response = expenseService
                .extractFromReceipt(file, groupId, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    // ─── 4. Save AI Extracted Expense (after user reviews) ───────────────

    @PostMapping("/save-ai")
    @Operation(summary = "Save AI extracted expense after user reviews it")
    public ResponseEntity<ExpenseDTOs.ExpenseResponse> saveAiExpense(
            @Valid @RequestBody ExpenseDTOs.ManualExpenseRequest request,
            @RequestParam String type,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Expense.ExpenseType expenseType = type.equals("RECEIPT_UPLOAD")
                ? Expense.ExpenseType.RECEIPT_UPLOAD
                : Expense.ExpenseType.NATURAL_LANGUAGE;

        ExpenseDTOs.ExpenseResponse response = expenseService
                .saveAiExtractedExpense(request, userDetails.getUsername(), expenseType);
        return ResponseEntity.ok(response);
    }

    // ─── 5. Get Group Expenses ────────────────────────────────────────────

    @GetMapping("/group/{groupId}")
    @Operation(summary = "Get all expenses for a group")
    public ResponseEntity<List<ExpenseDTOs.ExpenseResponse>> getGroupExpenses(
            @PathVariable String groupId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        List<ExpenseDTOs.ExpenseResponse> expenses = expenseService
                .getGroupExpenses(groupId, userDetails.getUsername());
        return ResponseEntity.ok(expenses);
    }

    // ─── 6. Delete Expense ────────────────────────────────────────────────

    @DeleteMapping("/{expenseId}")
    @Operation(summary = "Delete an expense")
    public ResponseEntity<String> deleteExpense(
            @PathVariable String expenseId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        expenseService.deleteExpense(expenseId, userDetails.getUsername());
        return ResponseEntity.ok("Expense deleted successfully");
    }
}
