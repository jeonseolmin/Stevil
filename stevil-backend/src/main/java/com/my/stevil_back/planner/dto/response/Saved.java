package com.my.stevil_back.planner.dto.response;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

import com.my.stevil_back.planner.dto.*;
public record Saved(long revision, Preferences preferences, List<Event> events) {}
