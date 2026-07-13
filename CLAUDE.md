# Paseo Restaurant Ops

**לפני עבודה על פיצ'רים חדשים: קרא את [ROADMAP.md](ROADMAP.md)** — תוכנית שלבים מלאה מול מפרט הלקוח, כולל מה הושלם ומה הבא.

מערכת ניהול תפעול למסעדת פסאו — בנייה מחדש של אפליקציית Lovable הישנה (missionspaseo.lovable.app), הפעם בשליטה מלאה.

## Stack
- React 19 + Vite + TypeScript
- Tailwind CSS v4 (via `@tailwindcss/vite`) — עברית RTL, פונט Heebo
- Supabase: פרויקט `Paseo-Restaurant-Ops` (id: `gkglkwxfnwdfijzqygie`, eu-central-1) בחשבון Supabase של ירין
- הרצה: `npm run dev` (פורט 5173). Node מותקן ב-`~/.local/node/bin` (לא דרך brew)

## מבנה
- `src/pages/Faults.tsx` — תקלות (route `/`): דיווח, סגירת קריאה עם עלות, היסטוריה. מכיל גם `Modal`/`DialogButtons`/`inputCls` המשותפים
- `src/pages/Tasks.tsx` — משימות אדמין (`/tasks`)
- `src/pages/Vendors.tsx` — אנשי מקצוע (`/vendors`): CRUD, דירוג כוכבים, חיוג והעתקת מספר
- `src/pages/Auth.tsx` — התחברות/הרשמה

## DB (public schema)
`tasks` (תקלות), `admin_tasks` (משימות), `vendors`, `task_history`, `profiles`, `user_roles` + bucket `task-images`.
טריגר `on_auth_user_created` יוצר profile + role 'staff' לכל נרשם חדש.
RLS: כל משתמש מחובר קורא/כותב הכל (אפליקציית צוות פנימית).

## RTL כללים
להשתמש ב-logical properties בלבד (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`).
מספרי טלפון/מחירים עוטפים ב-`.ltr-num` או `dir="ltr"`.
