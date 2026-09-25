package com.my.stevil_back.reminder.entity.enumType;

/*
 * 리마인더 종류. 알림 문구와 이동 경로(PR-A 내부 경로 검증을 통과하는 값)를 함께 가진다.
 * DB 에는 문자열로 저장되므로 값 추가는 안전하지만 이름 변경/삭제는 금지.
 * HOSPITAL 은 enum 만 유지하고 PR-C 에서는 생성할 수 없다(1회성 일정은 후속 PR).
 */
public enum ReminderType {
    MEAL("식사 시간이에요", "/diet"),
    EXERCISE("운동 시간이에요", "/exercise"),
    INJECTION("주사 시간이에요", "/diary"),
    WEIGHT("체중을 기록할 시간이에요", "/weight"),
    HOSPITAL("병원 방문 알림", "/hospitals");

    private final String defaultTitle;
    private final String targetUrl;

    ReminderType(String defaultTitle, String targetUrl) {
        this.defaultTitle = defaultTitle;
        this.targetUrl = targetUrl;
    }

    /** MEAL 은 mealType 이 있으면 그 문구, 없으면(Planner 식사) "식사 시간이에요". 시간대로 식사 종류를 추정하지 않는다. */
    public String title(MealType mealType) {
        if (this == MEAL && mealType != null) {
            return mealType.title();
        }
        return defaultTitle;
    }

    public String targetUrl() {
        return targetUrl;
    }
}
