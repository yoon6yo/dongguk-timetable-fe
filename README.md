# dongguk-timetable-fe

동국대 시간표 마법사 — 그룹을 만들고 과목을 담으면 충돌 없는 시간표 조합을 찾아주는 웹 앱
(Next.js, 프론트엔드 + 읽기 전용 API Routes가 한 앱).

강의 데이터를 수집하는 크롤러([dongguk-timetable](https://github.com/yoon6yo/dongguk-timetable), private)와는
별도 레포입니다 — 이 레포는 MySQL을 **읽기만** 하고, 학교 계정 로그인 로직은 전혀 포함하지 않습니다.

## 로컬 개발

이 레포 혼자서는 MySQL이 없어 동작하지 않습니다 — `dongguk-timetable`(private) 레포의
`docker compose up -d mysql` + `scribe --migrate-only`로 로컬 DB를 먼저 준비한 뒤:

```bash
cp .env.example .env.local   # DB_* 값을 채움
npm install
npm run dev
```

## 스크립트

| 명령 | 역할 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 (`output: standalone`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | vitest (lib/store 순수 로직 위주) |

## 구조

- `src/app/api/*` — 읽기 전용 API Routes (MySQL 직접 조회, 최신 학기 데이터만)
- `src/lib/` — 충돌체크/점수계산/조합생성/검색 등 순수 로직 (전부 vitest로 테스트됨)
- `src/store/` — zustand (그룹/가중치는 localStorage persist, 마법사 단계는 비영속)
- `src/workers/combinationWorker.ts` — 조합 생성을 메인 스레드 밖에서 실행
- `src/components/` — 5단계 마법사 UI
- `k8s/` — 이 앱만의 Deployment/Service/Ingress

Web Worker 배선 자체(`useCombinationWorker`, `combinationWorker.ts`)는 jsdom에 실제 Worker 구현이
없어 단위 테스트 대상이 아닙니다 — 실제로 감싸는 로직(`combinationGenerator.ts`, `scoring.ts` 등)은
전부 별도로 테스트되어 있습니다.

## 배포

`k8s/`의 매니페스트는 **이미 존재하는** `timetable` 네임스페이스 / `mysql` Service / `timetable-mysql-secret`
/ `ghcr-secret`을 전제로 합니다 — 이것들은 전부 `dongguk-timetable`(private) 레포의 `k8s/setup.sh`가
한 번만 만들어둡니다. 이 레포는 그 위에 자신의 Deployment/Service/Ingress만 추가로 얹습니다:

```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml   # PLACEHOLDER_DOMAIN을 실제 도메인으로 바꾼 뒤
```

이후 `main`에 push하면 GitHub Actions가 이미지를 빌드해 GHCR에 올리고, SSH로 접속해
`kubectl set image`로 롤링 업데이트합니다 (`.github/workflows/deploy.yml`).

### GitHub Actions secrets

`K8S_SSH_HOST`, `K8S_SSH_USER`, `K8S_SSH_KEY` — DB 자격증명은 여기 전혀 필요 없습니다
(런타임에 `timetable-mysql-secret`에서 주입됨).
