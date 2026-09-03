import unittest
from planner import schedule, validate_preferences, minutes

def preferences():
    return dict(weekStart='2026-09-07',wakeTime='07:00',sleepTime='23:00',breakfastTime='08:00',lunchTime='12:30',dinnerTime='18:30',exerciseTime='19:30',exerciseMinutes=30,exerciseDays=[0,2,4],intensity='가볍게',busySlots=[],experience='초보')

def suggestions():
    return [dict(meals=[dict(title=t,details='예시') for t in ['아침','점심','저녁']],exercise=dict(title='활동',details='예시')) for _ in range(7)]

class PlannerTest(unittest.TestCase):
    def test_busy_time_moves_meal_without_overlap(self):
        p=preferences();p['busySlots']=[dict(day=0,start='12:00',end='14:00')]
        result=schedule(p,suggestions())
        self.assertEqual(len(result['events']),24)
        monday=[e for e in result['events'] if e['start'].startswith('2026-09-07')]
        for e in monday:
            self.assertTrue(e['end'][11:]<='12:00' or e['start'][11:]>='14:00')
        self.assertTrue(result['notices'])
        for a,b in zip(result['events'],result['events'][1:]):self.assertLessEqual(a['end'],b['start'])
    def test_full_day_has_no_scheduled_events(self):
        p=preferences();p['busySlots']=[dict(day=0,start='00:00',end='23:59')]
        result=schedule(p,suggestions())
        self.assertFalse(any(e['start'].startswith('2026-09-07') for e in result['events']))
        self.assertEqual(len(result['notices']),4)
    def test_overnight_and_invalid_week_rejected(self):
        p=preferences();p['sleepTime']='06:00'
        with self.assertRaises(ValueError):validate_preferences(p)
        p=preferences();p['weekStart']='2026-09-08'
        with self.assertRaises(ValueError):validate_preferences(p)
    def test_java_time_format(self):self.assertEqual(minutes('07:00:00'),420)
    def test_exercise_stays_inside_day_window(self):
        p=preferences();p['exerciseWindows']=[dict(day=0,start='09:00',end='10:00')]
        workouts=[e for e in schedule(p,suggestions())['events'] if e['kind']=='EXERCISE' and e['start'].startswith('2026-09-07')]
        self.assertEqual(len(workouts),1)
        self.assertGreaterEqual(workouts[0]['start'][11:],'09:00')
        self.assertEqual(workouts[0]['start'][11:],'09:00')
        self.assertEqual(workouts[0]['end'][11:],'10:00')
        p['busySlots']=[dict(day=0,start='09:00',end='10:00')]
        result=schedule(p,suggestions())
        self.assertFalse(any(e['kind']=='EXERCISE' and e['start'].startswith('2026-09-07') for e in result['events']))
        self.assertTrue(result['notices'])
    def test_short_and_duplicate_windows_rejected(self):
        p=preferences();p['exerciseWindows']=[dict(day=0,start='09:00',end='09:05')]
        with self.assertRaises(ValueError):validate_preferences(p)
        p['exerciseWindows']=[dict(day=0,start='09:00',end='10:00')]*2
        with self.assertRaises(ValueError):validate_preferences(p)

if __name__=='__main__':unittest.main()
