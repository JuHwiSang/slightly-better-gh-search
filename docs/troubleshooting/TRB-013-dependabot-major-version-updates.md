# TRB-013: Dependabot major 업데이트가 개별 PR로 쏟아짐

## 문제 상황

Dependabot 설정에서 minor/patch만 그룹으로 묶고 major는 그룹에 포함하지 않았음.
의존성들의 major 버전 변경이 예상보다 훨씬 빈번하게 발생하면서 문제가 됨.

### 증상

- major 업데이트는 그룹에 속하지 않아 **패키지당 개별 PR**로 생성됨
- 일주일 만에 major 업데이트가 10개를 훨씬 넘게 발생
- `open-pull-requests-limit: 10`에 걸려서 일부 업데이트는 PR 생성조차 안 됨
- 개별 PR을 하나하나 수락하는 것도 부담

## 원인

기존 설정에서 `update-types`를 `minor`, `patch`로만 지정했기 때문에 major
업데이트는 그룹 밖으로 빠져나와 각각 독립된 PR로 생성됨.

```yaml
# Before (major가 그룹에서 빠짐 → 개별 PR로 쏟아짐)
groups:
  production-dependencies:
    dependency-type: "production"
    update-types:
      - "minor"
      - "patch"
  dev-dependencies:
    dependency-type: "development"
    update-types:
      - "minor"
      - "patch"
```

Dependabot의 그룹 동작:
- 그룹에 매칭되는 업데이트 → 하나의 PR로 묶임
- 그룹에 매칭되지 않는 업데이트 → 패키지당 개별 PR 생성

major 업데이트가 전부 후자에 해당해서 PR이 폭증한 것.

## 해결

`update-types` 필터를 제거하고, `patterns: ["*"]`로 모든 의존성·모든 버전 범위를
하나의 그룹 PR로 묶이도록 변경.

```yaml
# After (전부 하나의 PR로 묶임)
groups:
  all-dependencies:
    patterns:
      - "*"
```

`patterns`는 패키지 이름 매칭이고 `update-types` 필터가 없으므로 major, minor,
patch 전부 하나의 그룹 PR로 생성됨.

## 관련 파일

- `.github/dependabot.yml`
