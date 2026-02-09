// CommentRepository.java
package by.forestapp.stepOne.repository;

import by.forestapp.stepOne.model.Comment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByPlaceId(Long placeId);
}