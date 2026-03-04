package helix.example.demo.split;

import helix.example.demo.auth.User;
import helix.example.demo.expense.Expense;
import helix.example.demo.group.Group;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "splits")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Split {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // Who owes money
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owes_by", nullable = false)
    private User owesBy;

    // Who is owed money
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owes_to", nullable = false)
    private User owesTo;

    // How much
    @Column(nullable = false)
    private Double amount;

    // Which expense this split belongs to
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "expense_id", nullable = false)
    private Expense expense;

    // Which group
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private Group group;

    // Is this settled?
    @Column(nullable = false)
    private Boolean settled;

    @Column(name = "settled_at")
    private LocalDateTime settledAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.settled = false;
    }
}