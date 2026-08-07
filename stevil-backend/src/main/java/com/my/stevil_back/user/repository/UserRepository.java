package com.my.stevil_back.user.repository;

import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.auth.social.entity.enumType.ProviderType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
}
