package com.my.stevil_back.ad.service;

import com.my.stevil_back.patientreport.repository.PatientReportRepository;
import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class DoctorDashboardServiceTest {
    private final UserRepository users = mock(UserRepository.class);
    private final PatientReportRepository reports = mock(PatientReportRepository.class);
    private final DoctorDashboardService service = new DoctorDashboardService(users, reports);

    @Test
    void statsUseRequestedDoctorAndPreserveMissingCodeFallback() {
        when(users.findById(17L)).thenReturn(Optional.of(User.builder().id(17L).build()));
        when(users.countByAttendingDoctorId(17L)).thenReturn(3L);
        when(reports.countByDoctorIdAndStatus(17L, "UNREAD")).thenReturn(2L);

        var result = service.getDashboardStats(17L);

        assertEquals("코드 미발급", result.get("doctorCode"));
        assertEquals(3L, result.get("totalPatients"));
        assertEquals(2L, result.get("pendingReports"));
        assertEquals(0L, result.get("activeAds"));
        verify(reports).countByDoctorIdAndStatus(17L, "UNREAD");
    }

    @Test
    void patientsPreserveResponseFieldsAndMissingDemographics() {
        var patient = User.builder().id(8L).nickname("환자").email("patient@example.com").build();
        when(users.findByAttendingDoctorId(17L)).thenReturn(List.of(patient));

        var result = service.getMyPatients(17L);

        assertEquals(1, result.size());
        assertEquals(8L, result.getFirst().get("id"));
        assertEquals("환자", result.getFirst().get("nickname"));
        assertEquals("patient@example.com", result.getFirst().get("email"));
        assertEquals(0, result.getFirst().get("age"));
        assertEquals("UNKNOWN", result.getFirst().get("gender"));
        verify(users).findByAttendingDoctorId(17L);
    }
}
