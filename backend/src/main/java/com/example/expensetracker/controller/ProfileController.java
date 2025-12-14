package com.example.expensetracker.controller;

import com.example.expensetracker.model.Profile;
import com.example.expensetracker.repository.ProfileRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/profiles")
@CrossOrigin(origins = "*")
public class ProfileController {

    private final ProfileRepository profileRepository;

    public ProfileController(ProfileRepository profileRepository) {
        this.profileRepository = profileRepository;
    }

    @GetMapping
    public List<Profile> getAllProfiles() {
        return profileRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Profile> getProfile(@PathVariable String id) {
        return profileRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Profile createProfile(@RequestBody Profile profile) {
        profile.setCreatedAt(LocalDateTime.now());
        profile.setUpdatedAt(LocalDateTime.now());
        return profileRepository.save(profile);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Profile> updateProfile(@PathVariable String id, @RequestBody Profile profile) {
        return profileRepository.findById(id)
                .map(existing -> {
                    existing.setName(profile.getName());
                    existing.setDob(profile.getDob());
                    existing.setRetirementAge(profile.getRetirementAge());
                    existing.setUpdatedAt(LocalDateTime.now());
                    return ResponseEntity.ok(profileRepository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProfile(@PathVariable String id) {
        if (profileRepository.existsById(id)) {
            profileRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}
