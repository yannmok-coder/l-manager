# 롤매니저

League of Legends를 소재로 한 팬메이드 구단 매니지먼트 게임 (Vite + React).

## 로컬 실행

```bash
npm install
npm run dev
```

## GitHub → Vercel 배포

1. 이 폴더로 새 GitHub 저장소를 만들고 푸시합니다.
   ```bash
   git init
   git add .
   git commit -m "init"
   git branch -M main
   git remote add origin <내 GitHub 저장소 URL>
   git push -u origin main
   ```
2. [vercel.com](https://vercel.com) 에서 "Add New… → Project"로 방금 만든 GitHub 저장소를 선택합니다.
3. 프레임워크는 **Vite**로 자동 인식됩니다. Build Command `npm run build`, Output Directory `dist` 그대로 두고 Deploy를 누르면 끝입니다.
4. 이후 `main` 브랜치에 푸시할 때마다 Vercel이 자동으로 재배포합니다.

## 알아두면 좋은 점

- **저장 방식**: 원래 Claude 아티팩트 환경에서 쓰던 `window.storage` API를 `src/storageShim.js`에서 브라우저 `localStorage` 기반으로 그대로 재현해뒀어요. 그래서 `src/App.jsx`(게임 로직 전체)는 수정 없이 그대로 옮겨왔습니다. 즉, 구단 데이터는 **각자의 브라우저에** 저장됩니다(다른 기기·다른 브라우저와는 공유되지 않아요).
- **온라인 매칭(초대 코드) 제한**: "공유 저장소" 흉내도 `localStorage`로 만들어놨는데, 이건 실제로는 다른 사람과 공유되지 않고 **같은 브라우저 안에서만** 동작해요(테스트하려면 같은 브라우저에서 탭 두 개로 열어보시면 됩니다). 진짜로 다른 사람과 초대 코드를 주고받으려면 Supabase 같은 실제 백엔드를 붙여야 하는데, 원하시면 그 작업도 도와드릴 수 있어요.
- **폰트**: 코드 안에서 Google Fonts(`Teko`, `Rajdhani`)를 `@import`로 불러오고 있어서 별도 설정 없이 그대로 적용됩니다.
