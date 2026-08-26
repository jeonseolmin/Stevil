package com.my.stevil_back.diet.controller;

import com.my.stevil_back.diet.service.FoodApiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/diet")
@RequiredArgsConstructor
public class DietApiController {

    private final FoodApiService foodApiService;

    @GetMapping("/food/search")
    public ResponseEntity<String> searchFood(@RequestParam String keyword) {
        return ResponseEntity.ok(foodApiService.searchFoodNutrients(keyword));
    }
}