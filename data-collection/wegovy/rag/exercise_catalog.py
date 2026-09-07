"""
Structured exercise catalog for Stevil.

The catalog controls which concrete exercises may be recommended.

Important:
- CSV descriptions and kcal values are NOT treated as clinical evidence.
- Medical/effect claims must come from reviewed evidence retrieval.
- User limitations are handled conservatively.
"""

import csv
from pathlib import Path


BASE = Path(__file__).parent

EXERCISE_CSV = (
    BASE.parents[1]
    / "DB"
    / "exercises.csv"
)


# =========================================================
# Stable exercise IDs
# =========================================================

EXERCISE_IDS = {
    "걷기": "walking",
    "빠르게 걷기": "brisk_walking",
    "달리기(러닝머신)": "treadmill_running",
    "실내 자전거": "stationary_bike",
    "천국의 계단(스텝밀)": "stepmill",
    "수영": "swimming",
    "줄넘기": "jump_rope",
    "등산": "hiking",

    "스쿼트": "squat",
    "런지": "lunge",
    "레그 프레스": "leg_press",
    "레그 익스텐션": "leg_extension",
    "레그 컬": "leg_curl",
    "이너싸이(아웃싸이)": "hip_abduction_adduction",
    "덩키 킥": "donkey_kick",

    "푸시업(팔굽혀펴기)": "pushup",
    "니 푸시업": "knee_pushup",
    "체스트 프레스": "chest_press",
    "펙덱 플라이": "pec_deck",
    "벤치 프레스": "bench_press",

    "랫풀다운": "lat_pulldown",
    "시티드 로우": "seated_row",
    "풀업(턱걸이)": "pullup",
    "어시스트 풀업": "assisted_pullup",
    "바벨 로우": "barbell_row",
    "데드리프트": "deadlift",
    "백 익스텐션": "back_extension",

    "사이드 래터럴 레이즈": "lateral_raise",
    "덤벨 숄더 프레스": "dumbbell_shoulder_press",
    "프론트 레이즈": "front_raise",

    "덤벨 컬": "dumbbell_curl",
    "케이블 푸시다운": "cable_pushdown",
    "킥백": "triceps_kickback",

    "크런치": "crunch",
    "레그 레이즈": "leg_raise",
    "플랭크": "plank",
    "러시안 트위스트": "russian_twist",

    "마운틴 클라이머": "mountain_climber",
    "버피 테스트": "burpee",
    "슬로우 버피": "slow_burpee",

    "폼롤러 스트레칭": "foam_rolling",
    "전신 스트레칭": "full_body_stretch",
    "요가": "yoga",
    "필라테스": "pilates",

    "계단 오르기(아파트)": "stair_climbing",
    "브릿지(힙업)": "glute_bridge",
    "케틀벨 스윙": "kettlebell_swing",
    "AB 슬라이드": "ab_wheel",
    "슈퍼맨 자세(맨몸 백익스텐션)": "superman",
    "점핑잭(팔벌려뛰기)": "jumping_jack",
}


# =========================================================
# Activity types
#
# CSV의 유산소/무산소 표현을 추천 시스템에서
# 사용할 형태로 정규화합니다.
# =========================================================

CATEGORY_MAP = {
    "유산소": "aerobic",
    "무산소": "resistance",
    "스트레칭": "mobility",
}


DIFFICULTY_MAP = {
    "초": "beginner",
    "중": "intermediate",
    "고": "advanced",
}


# =========================================================
# Conservative impact classification
#
# 이것은 "안전하다"는 의미가 아닙니다.
# 단순히 충격이 큰 동작을 필터링하기 위한
# 기술적 분류입니다.
# =========================================================

HIGH_IMPACT = {
    "treadmill_running",
    "jump_rope",
    "burpee",
    "mountain_climber",
    "jumping_jack",
}

MODERATE_IMPACT = {
    "stepmill",
    "hiking",
    "stair_climbing",
    "kettlebell_swing",
    "lunge",
}

LOW_IMPACT = {
    "walking",
    "brisk_walking",
    "stationary_bike",
    "swimming",
    "slow_burpee",
    "yoga",
    "pilates",
    "full_body_stretch",
    "foam_rolling",
}


# =========================================================
# Higher-skill exercises
#
# 초보자에게 자동 추천하지 않을 운동
# =========================================================

HIGH_SKILL = {
    "bench_press",
    "barbell_row",
    "deadlift",
    "kettlebell_swing",
    "ab_wheel",
    "pullup",
}


def normalize_impact(exercise_id):
    if exercise_id in HIGH_IMPACT:
        return "high"

    if exercise_id in MODERATE_IMPACT:
        return "moderate"

    if exercise_id in LOW_IMPACT:
        return "low"

    return "unknown"


def load_catalog():
    if not EXERCISE_CSV.exists():
        raise FileNotFoundError(
            f"Exercise CSV not found: {EXERCISE_CSV}"
        )

    rows = []

    with EXERCISE_CSV.open(
        encoding="utf-8-sig",
        newline="",
    ) as file:
        reader = csv.DictReader(file)

        for row in reader:
            name = row["운동명"].strip()

            exercise_id = EXERCISE_IDS.get(
                name
            )

            if not exercise_id:
                # ID가 정의되지 않은 운동은
                # 추천 대상에서 제외합니다.
                continue

            category = CATEGORY_MAP.get(
                row["카테고리"].strip(),
                "unknown",
            )

            difficulty = (
                DIFFICULTY_MAP.get(
                    row["난이도"].strip(),
                    "unknown",
                )
            )

            rows.append(
                {
                    "id": exercise_id,

                    "name": name,

                    "category": category,

                    "target":
                        row[
                            "타겟 부위"
                        ].strip(),

                    "equipment":
                        row[
                            "필요장비"
                        ].strip(),

                    "difficulty":
                        difficulty,

                    "impact":
                        normalize_impact(
                            exercise_id
                        ),

                    "highSkill":
                        exercise_id
                        in HIGH_SKILL,
                }
            )

    return rows


# =========================================================
# User preference filtering
# =========================================================

def filter_catalog(
    catalog,
    *,
    experience="",
    intensity="",
    limitations="",
):
    """
    Conservative candidate filtering.

    이 함수는 의료 판단을 하지 않습니다.

    예:
    - 운동 초보자에게 advanced/high-skill 운동 제외
    - 사용자가 관절/무릎 제한을 명시한 경우
      high-impact 활동을 자동 후보에서 제외

    '무릎이 아프면 수영이 안전하다' 같은
    의료적 판단은 여기서 하지 않습니다.
    """

    experience_text = (
        experience or ""
    ).lower()

    limitation_text = (
        limitations or ""
    ).lower()

    beginner = any(
        keyword in experience_text
        for keyword in (
            "초보",
            "처음",
            "경험 없음",
            "운동 안",
            "운동을 안",
        )
    )

    joint_limitation = any(
        keyword in limitation_text
        for keyword in (
            "무릎",
            "관절",
            "발목",
            "충격",
        )
    )

    results = []

    for exercise in catalog:
        # -----------------------------------------
        # Beginner filtering
        # -----------------------------------------

        if beginner:
            if (
                exercise[
                    "difficulty"
                ]
                == "advanced"
            ):
                continue

            if exercise[
                "highSkill"
            ]:
                continue

        # -----------------------------------------
        # Impact filtering
        # -----------------------------------------

        if joint_limitation:
            if exercise[
                "impact"
            ] == "high":
                continue

        # -----------------------------------------
        # User requested light intensity
        # -----------------------------------------

        if intensity == "가볍게":
            if exercise[
                "impact"
            ] == "high":
                continue

        results.append(
            exercise
        )

    return results


def exercise_by_id(
    catalog,
    exercise_id,
):
    for exercise in catalog:
        if (
            exercise["id"]
            == exercise_id
        ):
            return exercise

    return None


if __name__ == "__main__":
    catalog = load_catalog()

    print(
        "Exercise catalog:",
        len(catalog),
    )

    beginner = filter_catalog(
        catalog,
        experience="운동 초보",
        intensity="가볍게",
        limitations="",
    )

    print(
        "Beginner candidates:",
        len(beginner),
    )

    print()

    for exercise in beginner[:15]:
        print(
            exercise[
                "id"
            ],
            "|",
            exercise[
                "name"
            ],
            "|",
            exercise[
                "category"
            ],
            "|",
            exercise[
                "difficulty"
            ],
            "|",
            exercise[
                "impact"
            ],
        )