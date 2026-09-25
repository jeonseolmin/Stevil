package com.my.stevil_back.reminder.entity.enumType;

public enum MealType {
    BREAKFAST("아침 식사 시간이에요"),
    LUNCH("점심 식사 시간이에요"),
    DINNER("저녁 식사 시간이에요"),
    SNACK("간식 시간이에요");

    private final String title;

    MealType(String title) {
        this.title = title;
    }

    public String title() {
        return title;
    }
}
