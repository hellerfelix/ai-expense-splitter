package helix.example.demo.group;

import helix.example.demo.auth.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface GroupRepository extends JpaRepository<Group, UUID> {

    @Query("SELECT g FROM Group g WHERE :user MEMBER OF g.members OR g.createdBy = :user")
    List<Group> findGroupsByMember(@Param("user") User user);


}