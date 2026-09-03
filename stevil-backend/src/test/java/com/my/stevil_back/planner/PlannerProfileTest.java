package com.my.stevil_back.planner;
import com.my.stevil_back.common.security.oauth.entity.CustomUserDetails;
import com.my.stevil_back.user.entity.*;
import com.my.stevil_back.user.entity.enumType.Sex;
import com.my.stevil_back.user.repository.*;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.*;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PlannerProfileTest {
    @Test void readsOnlyAuthenticatedUsersLatestMeasurementWithoutWriting() {
        var users=mock(UserRepository.class);var weights=mock(UserWeightRepository.class);
        var principal=mock(CustomUserDetails.class);when(principal.getUserId()).thenReturn(17L);
        var user=User.builder().id(17L).heightCm(175.0).sex(Sex.MALE).birthDate(LocalDate.of(1995,1,1)).build();
        when(users.findById(17L)).thenReturn(Optional.of(user));
        var measured=LocalDateTime.of(2026,9,1,8,0);
        when(weights.findFirstByUserIdAndRecordedAtLessThanEqualOrderByRecordedAtDescIdDesc(eq(17L),any()))
                .thenReturn(Optional.of(UserWeight.create(user,new BigDecimal("72.30"),null,measured)));
        var result=new PlannerProfileController(users,weights).get(principal);
        assertEquals(72.3,result.weightKg());assertEquals(measured,result.weightRecordedAt());assertEquals(175.0,result.heightCm());
        verify(weights).findFirstByUserIdAndRecordedAtLessThanEqualOrderByRecordedAtDescIdDesc(eq(17L),any());
        verifyNoMoreInteractions(weights);
    }
    @Test void missingMeasurementAndDemographicsRemainNull() {
        var users=mock(UserRepository.class);var weights=mock(UserWeightRepository.class);
        var principal=mock(CustomUserDetails.class);when(principal.getUserId()).thenReturn(8L);
        when(users.findById(8L)).thenReturn(Optional.of(User.builder().id(8L).build()));
        when(weights.findFirstByUserIdAndRecordedAtLessThanEqualOrderByRecordedAtDescIdDesc(eq(8L),any())).thenReturn(Optional.empty());
        var result=new PlannerProfileController(users,weights).get(principal);
        assertNull(result.weightKg());assertNull(result.age());assertNull(result.sex());
    }
}
