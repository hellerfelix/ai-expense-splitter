package helix.example.demo.auth;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Register, Login APIs")
public class AuthController {

    private final AuthService authService;

    // POST /api/auth/register
    @PostMapping("/register")
    @Operation(summary = "Register a new user")
    public ResponseEntity<AuthDTOs.AuthResponse> register(
            @Valid @RequestBody AuthDTOs.RegisterRequest request
    ) {
        AuthDTOs.AuthResponse response = authService.register(request);
        return ResponseEntity.ok(response);
    }

    // POST /api/auth/login
    @PostMapping("/login")
    @Operation(summary = "Login with email and password")
    public ResponseEntity<AuthDTOs.AuthResponse> login(
            @Valid @RequestBody AuthDTOs.LoginRequest request
    ) {
        AuthDTOs.AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    // GET /api/auth/me — Get currently logged in user info
    @GetMapping("/me")
    @Operation(summary = "Get current logged in user")
    public ResponseEntity<?> getCurrentUser(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body("Unauthorized. Please login first.");
        }
        AuthDTOs.UserResponse response = authService.getCurrentUser(userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/change-password")
    public ResponseEntity<String> changePassword(
            @RequestBody AuthDTOs.ChangePasswordRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        authService.changePassword(request, userDetails.getUsername());
        return ResponseEntity.ok("Password changed successfully");
    }
}

