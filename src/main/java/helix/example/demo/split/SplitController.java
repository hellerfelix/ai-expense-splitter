package helix.example.demo.split;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/splits")
@RequiredArgsConstructor
@Tag(name = "Splits", description = "Split and Balance APIs")
@SecurityRequirement(name = "bearerAuth")
public class SplitController {

    private final SplitService splitService;

    // POST /api/splits/equal/{expenseId}
    @PostMapping("/equal/{expenseId}")
    @Operation(summary = "Split expense equally among all group members")
    public ResponseEntity<List<SplitDTOs.SplitResponse>> splitEqually(
            @PathVariable String expenseId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(
                splitService.splitEqually(expenseId, userDetails.getUsername()));
    }

    // POST /api/splits/itemwise/{expenseId}
    @PostMapping("/itemwise/{expenseId}")
    @Operation(summary = "Split expense by item assignment")
    public ResponseEntity<List<SplitDTOs.SplitResponse>> splitByItems(
            @PathVariable String expenseId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(
                splitService.splitByItems(expenseId, userDetails.getUsername()));
    }

    // GET /api/splits/balances/{groupId}
    @GetMapping("/balances/{groupId}")
    @Operation(summary = "Get who owes whom in a group")
    public ResponseEntity<SplitDTOs.GroupBalanceSummary> getGroupBalances(
            @PathVariable String groupId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(
                splitService.getGroupBalances(groupId, userDetails.getUsername()));
    }

    // POST /api/splits/settle
    @PostMapping("/settle")
    @Operation(summary = "Mark a split as settled")
    public ResponseEntity<SplitDTOs.SplitResponse> settleSplit(
            @Valid @RequestBody SplitDTOs.SettleRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(
                splitService.settleSplit(request, userDetails.getUsername()));
    }

    // GET /api/splits/expense/{expenseId}
    @GetMapping("/expense/{expenseId}")
    @Operation(summary = "Get all splits for an expense")
    public ResponseEntity<List<SplitDTOs.SplitResponse>> getExpenseSplits(
            @PathVariable String expenseId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(
                splitService.getExpenseSplits(expenseId));
    }

    // POST /api/splits/custom/{expenseId}
    @PostMapping("/custom/{expenseId}")
    @Operation(summary = "Split expense among selected members")
    public ResponseEntity<List<SplitDTOs.SplitResponse>> splitCustom(
            @PathVariable String expenseId,
            @RequestBody SplitDTOs.CustomSplitRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(
                splitService.splitCustom(expenseId, request, userDetails.getUsername()));
    }

    // GET /api/splits/settled/{groupId}  — FIX 1: replaces localStorage settled history
    @GetMapping("/settled/{groupId}")
    @Operation(summary = "Get all settled splits for a group")
    public ResponseEntity<List<SplitDTOs.SplitResponse>> getSettledSplits(
            @PathVariable String groupId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(
                splitService.getSettledSplits(groupId));
    }
}