---
name: commit
description: 변경사항을 분석하여 저장소 컨벤션(없으면 Conventional Commits)에 맞게 커밋한다. "커밋해줘", "commit", "변경사항 커밋", "/commit" 요청에 활성화한다. push, PR 생성, amend, 훅 우회는 사용자가 따로 요청하지 않는 한 하지 않는다.
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git branch:*), Bash(git checkout -b:*), Bash(git switch -c:*), Bash(git add:*), Bash(git commit:*), Bash(git show:*)
---

# Commit

**목적**: 변경사항을 분석하여 컨벤션에 맞게 커밋한다. 변경 내용을 읽고 논리 단위로 나눈 뒤, 각 단위의 의도를 컨벤션에 맞는 메시지로 남긴다.

**승인 없이 진행**: 이 스킬이 호출되면 메시지 초안이나 스테이징 목록을 보여주고 승인을 구하지 않는다. 분석 → 스테이징 → 커밋까지 한 번에 실행하고, 결과는 끝에 보고한다. 다만 아래 "하지 말 것"의 항목(push, amend, 훅 우회 등)은 승인 여부와 상관없이 실행하지 않는다.

## 컨벤션 결정 순서

1. 저장소에 명시된 규칙: `CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`, `commitlint.config.*`, `.gitmessage`
2. 최근 커밋 이력(`git log -20 --oneline`)에서 드러나는 관례 (언어, 접두어, scope 사용 여부)
3. 위가 모두 없으면 아래 "메시지 규칙"의 Conventional Commits

## 절차

1. **상태 파악** (병렬로 실행)
   - `git status` — 변경·미추적 파일 확인
   - `git diff HEAD` — 스테이징 여부와 상관없이 전체 변경 내용 확인
   - `git log -20 --oneline` — 이 저장소의 커밋 메시지 관례 확인
   - 위 "컨벤션 결정 순서"의 문서가 있으면 읽는다.
2. **저장소가 아니면** `git init`을 실행하지 말고, git 저장소가 아니라서 커밋하지 못했다고 보고한 뒤 멈춘다.
3. **현재 브랜치 확인**: 기본 브랜치(`main`/`master`)라면 먼저 작업 브랜치를 만든다. 브랜치 이름은 변경 내용을 요약한 `type/short-description` 형식으로 짓는다.
4. **스테이징 범위 결정**
   - 파일을 이름으로 지정해 `git add <file>...` 한다. `git add -A`, `git add .`는 쓰지 않는다.
   - 다음은 스테이징하지 않고 사용자에게 알린다: `.env`, 키·토큰·인증서, `node_modules/`, 빌드 산출물, 로그, 대용량 바이너리.
   - 서로 관련 없는 변경이 섞여 있으면 논리 단위별로 나눠 여러 커밋으로 만든다.
5. **메시지 작성** (아래 규칙) 후 커밋한다.
6. **결과 확인**: `git status`와 `git log -1 --stat`로 커밋이 의도대로 만들어졌는지 보고한다.

## 메시지 규칙

저장소에 이미 정착한 관례(언어, 접두어)가 있으면 그것을 따른다. 없으면 아래를 기본으로 한다.

```
<type>(<scope>): <요약>

<본문: 무엇을 왜 바꿨는지>
```

- **type**: `feat`, `fix`, `refactor`, `style`(UI 스타일·포맷), `docs`, `test`, `chore`, `perf`, `build`, `ci`
- **scope**: 선택. 변경된 영역(`ui`, `server`, `hooks` 등)
- **요약**: 72자 이내, 명령형·현재형, 마침표 없음. 사용자가 쓰는 언어(한국어 저장소면 한국어)로 쓴다.
- **본문**: 요약만으로 부족할 때만 쓴다. "어떻게"보다 "왜"를 적는다. 한 줄은 약 72자에서 줄바꿈한다.
- 변경 내용을 그대로 나열하지 말고 의도를 요약한다. 실제 diff에 없는 내용은 쓰지 않는다.

## 커밋 실행

여러 줄 메시지는 heredoc으로 넘긴다.

```bash
git commit -m "$(cat <<'EOF'
style(ui): 콘솔 스타일 내비게이션과 컨테이너 레이아웃 적용

상단 내비게이션 바, 브레드크럼, 헤더가 분리된 컨테이너로 구조를 바꾸고
버튼·탭·입력창 스타일을 통일했다.

Co-Authored-By: <시스템이 지정한 attribution 줄>
EOF
)"
```

- 세션의 system-reminder에 커밋용 attribution(`Co-Authored-By: ...`)이 지정되어 있으면 메시지 맨 끝에 그대로 붙인다. 지정되어 있지 않으면 붙이지 않는다.
- PowerShell에서는 single-quoted here-string(`@'` … `'@`)을 사용하고, 닫는 `'@`는 줄 맨 앞에 둔다.

## 하지 말 것

- 사용자가 요청하지 않았다면 `git push`, PR 생성, `--amend`, `reset --hard`, `--force` 계열을 실행하지 않는다.
- `--no-verify`, `--no-gpg-sign` 등으로 훅·서명을 우회하지 않는다. pre-commit 훅이 실패하면 원인을 고치고, 커밋은 새로 만든다(이전 커밋을 amend하지 않는다).
- 커밋할 변경이 없으면 빈 커밋을 만들지 말고 "커밋할 변경사항이 없습니다"라고 알린다.
- `git config`(사용자 이름·이메일 등)를 수정하지 않는다.

## 보고 형식

커밋 후 아래만 짧게 알린다.

- 만들어진 커밋의 해시와 제목 (여러 개면 목록)
- 의도적으로 제외한 파일과 그 이유
- push는 하지 않았다는 점 (필요하면 요청해 달라는 한 줄)
