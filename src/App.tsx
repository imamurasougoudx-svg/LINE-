import React, { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  HelpCircle,
  Home,
  Plus,
  QrCode,
  Receipt,
  Settings2,
  UserCircle2,
  Users,
} from "lucide-react";

const LIFF_ID = (import.meta.env.VITE_LIFF_ID as string | undefined) || "YOUR_LIFF_ID";
const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  "https://example-hospital-api.local";
const ENABLE_MOCK =
  ((import.meta.env.VITE_ENABLE_MOCK as string | undefined) ?? "true") === "true";

type Patient = {
  name: string;
  hospital: string;
  lineStatus: string;
  patientId: string;
};

type Appointment = {
  id: string;
  department: string;
  date: string;
  time: string;
  note: string;
  status: string;
};

type Payment = {
  id: string;
  title: string;
  date: string;
  amount: number;
  status: "未払い" | "支払い済み";
};

type FamilyMember = {
  id: string;
  name: string;
  relation: string;
  registered: boolean;
};

type LiffProfileLite = {
  displayName?: string;
  userId?: string;
};

type LiffState = {
  isReady: boolean;
  isLoggedIn: boolean;
  isInClient: boolean;
  isMock: boolean;
  profile: LiffProfileLite | null;
};

type LiffModuleLike = {
  init: (args: { liffId: string }) => Promise<void>;
  isLoggedIn: () => boolean;
  isInClient: () => boolean;
  getProfile: () => Promise<LiffProfileLite>;
  getIDToken: () => string | null;
  login: () => void;
};

const mockPatient: Patient = {
  name: "山田 太郎",
  hospital: "今村総合病院",
  lineStatus: "LINEログイン済み",
  patientId: "00012345",
};

const appointments: Appointment[] = [
  {
    id: "apt-1",
    department: "整形外科",
    date: "2026-04-15",
    time: "10:30",
    note: "受付30分前まで変更可",
    status: "予約済み",
  },
  {
    id: "apt-2",
    department: "内科",
    date: "2026-05-02",
    time: "09:00",
    note: "採血あり",
    status: "予約済み",
  },
];

const payments: Payment[] = [
  {
    id: "pay-1",
    title: "外来・内科",
    date: "2026-04-01",
    amount: 4280,
    status: "未払い",
  },
  {
    id: "pay-2",
    title: "整形外科",
    date: "2026-03-18",
    amount: 1860,
    status: "支払い済み",
  },
  {
    id: "pay-3",
    title: "皮膚科",
    date: "2026-02-28",
    amount: 2420,
    status: "支払い済み",
  },
];

const familyMembers: FamilyMember[] = [
  { id: "fam-1", name: "山田 花子", relation: "妻", registered: true },
  { id: "fam-2", name: "山田 次郎", relation: "子", registered: false },
];

const menuItems = [
  { id: "postpay", label: "あと払い設定", icon: Settings2 },
  { id: "history", label: "支払い履歴", icon: Receipt },
  { id: "family", label: "家族登録", icon: Users },
  { id: "guide", label: "受診案内", icon: CalendarDays },
  { id: "faq", label: "よくある質問", icon: HelpCircle },
  { id: "contact", label: "お問い合わせ", icon: Bell },
] as const;

const notices = [
  "本日の会計は診察終了後にLINEから確認できます。",
  "クレジットカード登録済みの方は窓口会計を省略できます。",
  "領収書・明細は支払い履歴から確認できます。",
];

const tabs = [
  { id: "home", label: "ホーム", icon: Home },
  { id: "reserve", label: "予約", icon: CalendarDays },
  { id: "payment", label: "支払い", icon: CreditCard },
  { id: "mypage", label: "マイページ", icon: UserCircle2 },
] as const;

type TabId = (typeof tabs)[number]["id"];

function yen(amount: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(amount);
}

async function loadLiffModule(): Promise<LiffModuleLike> {
  const imported = await import("@line/liff");
  return (imported.default ?? imported) as LiffModuleLike;
}

async function fetchPatientProfile(idToken: string | null): Promise<Patient> {
  if (ENABLE_MOCK) {
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    return { ...mockPatient };
  }

  const response = await fetch(`${API_BASE_URL}/patient/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${idToken ?? ""}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("患者情報の取得に失敗しました");
  }

  return (await response.json()) as Patient;
}

function LoadingScreen({ text = "患者ポータルの利用準備を進めています。" }: { text?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-[28px] bg-white p-8 text-center shadow-xl ring-1 ring-slate-200">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500" />
        <h1 className="mt-4 text-xl font-bold text-slate-900">LINE連携を確認中</h1>
        <p className="mt-2 text-sm text-slate-500">{text}</p>
      </div>
    </div>
  );
}

function ErrorScreen({
  errorMessage,
  onRetry,
  onUseMock,
}: {
  errorMessage: string;
  onRetry: () => void;
  onUseMock: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-[28px] bg-white p-8 shadow-xl ring-1 ring-slate-200">
        <div className="rounded-3xl bg-red-50 p-5 ring-1 ring-red-100">
          <h1 className="text-xl font-bold text-slate-900">接続確認でエラーが発生しました</h1>
          <p className="mt-2 text-sm text-slate-600">{errorMessage}</p>
        </div>
        <div className="mt-4 grid gap-2">
          <button
            onClick={onRetry}
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
          >
            再試行
          </button>
          <button
            onClick={onUseMock}
            className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700"
          >
            モックで起動
          </button>
        </div>
      </div>
    </div>
  );
}

function LoginRequiredScreen({
  onLogin,
  isInClient,
}: {
  onLogin: () => void;
  isInClient: boolean;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-[28px] bg-white p-8 shadow-xl ring-1 ring-slate-200">
        <div className="rounded-3xl bg-gradient-to-b from-emerald-500 to-emerald-600 p-5 text-white">
          <p className="text-sm opacity-90">今村総合病院 患者ポータル</p>
          <h1 className="mt-2 text-2xl font-bold">LINEログインが必要です</h1>
          <p className="mt-2 text-sm opacity-90">
            診察券情報・支払い情報を安全に表示するため、LINE連携後に利用できます。
          </p>
        </div>

        <div className="mt-4 space-y-3 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
            <p className="text-sm font-semibold text-slate-900">利用開始までの流れ</p>
            <p className="mt-1 text-xs text-slate-500">
              1. LINEログイン → 2. 患者確認 → 3. あと払い設定
            </p>
          </div>
          <button
            onClick={onLogin}
            className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white"
          >
            LINEでログイン
          </button>
          <p className="text-center text-xs text-slate-500">
            {isInClient ? "LINEアプリ内で認証を続けます" : "外部ブラウザではLINE認証画面へ遷移します"}
          </p>
        </div>
      </div>
    </div>
  );
}

function AppShell({
  children,
  activeTab,
  onTabChange,
  title,
  showBack,
  onBack,
  patient,
}: {
  children: React.ReactNode;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  title: string;
  showBack: boolean;
  onBack: () => void;
  patient: Patient;
}) {
  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <div className="mx-auto max-w-md overflow-hidden rounded-[28px] bg-white shadow-xl ring-1 ring-slate-200">
        <header className="bg-gradient-to-b from-emerald-500 to-emerald-600 px-5 pb-5 pt-6 text-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {showBack ? (
                <button
                  onClick={onBack}
                  className="rounded-2xl bg-white/15 p-2 transition hover:bg-white/20"
                  aria-label="戻る"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              ) : null}
              <div>
                <p className="text-xs opacity-90">{patient.hospital} 患者ポータル</p>
                <h1 className="mt-1 text-2xl font-bold">{title}</h1>
              </div>
            </div>
            <div className="rounded-2xl bg-white/15 px-3 py-2 text-xs">{patient.lineStatus}</div>
          </div>
        </header>

        <main className="space-y-4 px-4 py-4">{children}</main>
        <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
      </div>
    </div>
  );
}

function BottomNav({
  activeTab,
  onTabChange,
}: {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}) {
  return (
    <div className="grid grid-cols-4 border-t border-slate-200 bg-white px-2 py-2 text-center text-[11px] text-slate-500">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          className={`rounded-2xl px-2 py-2 ${activeTab === id ? "bg-emerald-50 font-semibold text-emerald-700" : ""}`}
        >
          <Icon className="mx-auto mb-1 h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  );
}

function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h2 className="text-base font-bold text-slate-800">{title}</h2>
      {actionLabel ? (
        <button onClick={onAction} className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
          {actionLabel}
          <ChevronRight className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

function StatusRow({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white px-3 py-2 ring-1 ring-slate-200">
      <span>{label}</span>
      <span className={emphasis ? "font-semibold text-emerald-700" : "font-medium text-slate-700"}>
        {value}
      </span>
    </div>
  );
}

function LiffDebugPanel({ liffState }: { liffState: LiffState }) {
  return (
    <section className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-800">LIFF検証状態</h2>
        <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">検証用</span>
      </div>
      <div className="mt-3 space-y-2 text-sm text-slate-600">
        <StatusRow label="LIFF ID" value={LIFF_ID} />
        <StatusRow label="LIFF初期化" value={liffState.isReady ? "完了" : "未完了"} emphasis={liffState.isReady} />
        <StatusRow
          label="LINEログイン"
          value={liffState.isLoggedIn ? "ログイン済み" : "未ログイン"}
          emphasis={liffState.isLoggedIn}
        />
        <StatusRow
          label="LINE内起動"
          value={liffState.isInClient ? "はい" : "いいえ"}
          emphasis={liffState.isInClient}
        />
        <StatusRow label="Mockモード" value={liffState.isMock ? "ON" : "OFF"} emphasis={liffState.isMock} />
        <div className="rounded-2xl bg-white px-3 py-2 ring-1 ring-slate-200">
          <p className="text-xs text-slate-500">LINE表示名</p>
          <p className="font-medium text-slate-900">{liffState.profile?.displayName ?? "未取得"}</p>
        </div>
      </div>
    </section>
  );
}

function PrimaryHero({
  onStart,
  patient,
}: {
  onStart: () => void;
  patient: Patient;
}) {
  return (
    <section className="rounded-3xl bg-gradient-to-b from-emerald-500 to-emerald-600 p-4 text-white shadow-sm">
      <p className="text-sm opacity-90">こんにちは、{patient.name}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <p className="text-3xl font-extrabold">あと払い</p>
          <p className="mt-1 text-sm opacity-90">会計待ちを減らして、そのまま帰宅</p>
        </div>
        <button
          onClick={onStart}
          className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-emerald-700 shadow-sm"
        >
          利用開始
        </button>
      </div>
    </section>
  );
}

function SummaryCard({
  title,
  value,
  sub,
  action,
  icon: Icon,
  onClick,
}: {
  title: string;
  value: string;
  sub: string;
  action: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{sub}</p>
        </div>
        <div className="rounded-2xl bg-emerald-50 p-2 text-emerald-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <button onClick={onClick} className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">
        {action}
      </button>
    </div>
  );
}

function FlowSection() {
  const steps = [
    ["1", "受診前にカード登録", "初回のみ。LINEから1分で設定"],
    ["2", "診察後はそのまま帰宅", "窓口会計に並ばず移動可能"],
    ["3", "LINEで結果確認", "支払い完了通知と明細を確認"],
  ] as const;

  return (
    <section className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-800">あと払いの流れ</h2>
        <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">3STEP</span>
      </div>
      <div className="mt-3 grid gap-3">
        {steps.map(([num, title, text]) => (
          <div key={num} className="flex gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-200">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-sm font-bold text-white">
              {num}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{title}</p>
              <p className="text-xs text-slate-500">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MenuGrid({
  onOpenHistory,
  onOpenFamily,
}: {
  onOpenHistory: () => void;
  onOpenFamily: () => void;
}) {
  return (
    <section>
      <SectionHeader title="メニュー" />
      <div className="grid grid-cols-2 gap-3">
        {menuItems.map(({ id, label, icon: Icon }) => {
          const handleClick = id === "history" ? onOpenHistory : id === "family" ? onOpenFamily : undefined;
          return (
            <button
              key={id}
              onClick={handleClick}
              className="rounded-3xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-slate-100 p-2 text-slate-600">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">{label}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function NoticeList() {
  return (
    <section className="rounded-3xl bg-amber-50 p-4 ring-1 ring-amber-200">
      <h2 className="text-base font-bold text-slate-800">お知らせ</h2>
      <ul className="mt-2 space-y-2 text-sm text-slate-700">
        {notices.map((notice) => (
          <li key={notice} className="rounded-2xl bg-white px-3 py-2 ring-1 ring-amber-100">
            {notice}
          </li>
        ))}
      </ul>
    </section>
  );
}

function HomeScreen({
  navigate,
  patient,
  liffState,
}: {
  navigate: (tab: TabId) => void;
  patient: Patient;
  liffState: LiffState;
}) {
  const unpaid = payments.find((item) => item.status === "未払い");
  const nextAppointment = appointments[0];

  return (
    <>
      <LiffDebugPanel liffState={liffState} />
      <PrimaryHero patient={patient} onStart={() => navigate("payment")} />
      <section>
        <SectionHeader title="ホーム" actionLabel="一覧へ" onAction={() => navigate("payment")} />
        <div className="space-y-3">
          <SummaryCard
            title="本日のお支払い"
            value={unpaid ? yen(unpaid.amount) : "なし"}
            sub={unpaid ? `${unpaid.title} / ${unpaid.date}` : "未払いはありません"}
            action="あとで支払う"
            icon={CreditCard}
            onClick={() => navigate("payment")}
          />
          <SummaryCard
            title="次回予約"
            value={`${nextAppointment.date} ${nextAppointment.time}`}
            sub={`${nextAppointment.department} / ${nextAppointment.note}`}
            action="予約を確認"
            icon={CalendarDays}
            onClick={() => navigate("reserve")}
          />
          <SummaryCard
            title="診察券QR"
            value="LINEで受付"
            sub="受付・本人確認で利用"
            action="QRを表示"
            icon={QrCode}
            onClick={() => navigate("mypage")}
          />
        </div>
      </section>
      <FlowSection />
      <MenuGrid onOpenHistory={() => navigate("payment")} onOpenFamily={() => navigate("mypage")} />
      <NoticeList />
    </>
  );
}

function ReserveScreen() {
  return (
    <section className="space-y-3">
      <SectionHeader title="予約一覧" />
      {appointments.map((item) => (
        <div key={item.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-bold text-slate-900">{item.department}</p>
              <p className="mt-1 text-sm text-slate-600">
                {item.date} {item.time}
              </p>
              <p className="mt-1 text-xs text-slate-500">{item.note}</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              {item.status}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">詳細を見る</button>
            <button className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700">変更する</button>
          </div>
        </div>
      ))}
    </section>
  );
}

function PaymentScreen() {
  const totalUnpaid = useMemo(
    () => payments.filter((item) => item.status === "未払い").reduce((sum, item) => sum + item.amount, 0),
    []
  );

  return (
    <section className="space-y-4">
      <div className="rounded-3xl bg-slate-900 p-4 text-white shadow-sm">
        <p className="text-sm text-slate-300">未払い合計</p>
        <p className="mt-1 text-3xl font-extrabold">{yen(totalUnpaid)}</p>
        <p className="mt-1 text-xs text-slate-300">登録済みカードで自動決済できます</p>
        <button className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900">
          あと払い設定を確認
        </button>
      </div>
      <div className="space-y-3">
        {payments.map((item) => (
          <div key={item.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-bold text-slate-900">{item.title}</p>
                <p className="mt-1 text-sm text-slate-500">{item.date}</p>
                <p className="mt-2 text-xl font-bold text-slate-900">{yen(item.amount)}</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  item.status === "未払い" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {item.status}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">明細を見る</button>
              <button className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700">
                領収書確認
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MyPageScreen({
  patient,
  profile,
}: {
  patient: Patient;
  profile: LiffProfileLite | null;
}) {
  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">利用者情報</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{patient.name}</p>
            <p className="mt-1 text-xs text-slate-500">診察券番号：{patient.patientId}</p>
            <p className="mt-1 text-xs text-slate-500">LINE表示名：{profile?.displayName ?? "未取得"}</p>
            <p className="mt-1 text-xs text-slate-500">LINE User ID：{profile?.userId ?? "未取得"}</p>
          </div>
          <div className="rounded-2xl bg-slate-100 p-3">
            <QrCode className="h-7 w-7 text-slate-700" />
          </div>
        </div>
        <button className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">
          診察券QRを表示
        </button>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800">家族登録</h2>
          <button className="inline-flex items-center gap-1 rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
            <Plus className="h-4 w-4" />
            追加
          </button>
        </div>
        <div className="space-y-3">
          {familyMembers.map((member) => (
            <div key={member.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <div>
                <p className="text-sm font-semibold text-slate-900">{member.name}</p>
                <p className="text-xs text-slate-500">{member.relation}</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  member.registered ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-700"
                }`}
              >
                {member.registered ? "連携済み" : "未登録"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [history, setHistory] = useState<TabId[]>(["home"]);
  const [bootState, setBootState] = useState<"loading" | "login" | "error" | "ready">("loading");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [profile, setProfile] = useState<LiffProfileLite | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [liffState, setLiffState] = useState<LiffState>({
    isReady: false,
    isLoggedIn: false,
    isInClient: false,
    isMock: ENABLE_MOCK,
    profile: null,
  });
  const [forceMock, setForceMock] = useState(false);
  const [liffModule, setLiffModule] = useState<LiffModuleLike | null>(null);

  const bootApp = async () => {
    setBootState("loading");
    setErrorMessage("");

    try {
      const useMock = forceMock || ENABLE_MOCK || LIFF_ID === "YOUR_LIFF_ID";

      if (useMock) {
        await new Promise((resolve) => window.setTimeout(resolve, 600));
        const mockProfile = { displayName: mockPatient.name, userId: "mock-user-id" };
        setProfile(mockProfile);
        setPatient(mockPatient);
        setLiffState({
          isReady: true,
          isLoggedIn: true,
          isInClient: true,
          isMock: true,
          profile: mockProfile,
        });
        setBootState("ready");
        return;
      }

      const loadedLiff = await loadLiffModule();
      setLiffModule(loadedLiff);

      await loadedLiff.init({ liffId: LIFF_ID });
      const isLoggedIn = loadedLiff.isLoggedIn();
      const isInClient = loadedLiff.isInClient();

      setLiffState((prev) => ({ ...prev, isReady: true, isLoggedIn, isInClient, isMock: false }));

      if (!isLoggedIn) {
        setBootState("login");
        return;
      }

      const liffProfile = await loadedLiff.getProfile();
      const idToken = loadedLiff.getIDToken();
      const patientData = await fetchPatientProfile(idToken);

      setProfile(liffProfile);
      setPatient({
        ...patientData,
        name: patientData.name || liffProfile.displayName || mockPatient.name,
        lineStatus: "LINEログイン済み",
      });
      setLiffState({
        isReady: true,
        isLoggedIn: true,
        isInClient,
        isMock: false,
        profile: liffProfile,
      });
      setBootState("ready");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "不明なエラーです");
      setBootState("error");
    }
  };

  useEffect(() => {
    void bootApp();
  }, [forceMock]);

  const handleLogin = () => {
    const useMock = forceMock || ENABLE_MOCK || LIFF_ID === "YOUR_LIFF_ID";
    if (useMock) {
      void bootApp();
      return;
    }
    liffModule?.login();
  };

  const handleUseMock = () => {
    setForceMock(true);
  };

  const navigate = (nextTab: TabId) => {
    setActiveTab(nextTab);
    setHistory((prev) => [...prev, nextTab]);
  };

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setHistory([tab]);
  };

  const handleBack = () => {
    if (history.length <= 1) return;
    const nextHistory = history.slice(0, -1);
    setHistory(nextHistory);
    setActiveTab(nextHistory[nextHistory.length - 1]);
  };

  if (bootState === "loading") {
    return <LoadingScreen text="LIFF初期化と患者情報の確認を行っています。" />;
  }

  if (bootState === "login") {
    return <LoginRequiredScreen onLogin={handleLogin} isInClient={liffState.isInClient} />;
  }

  if (bootState === "error") {
    return <ErrorScreen errorMessage={errorMessage} onRetry={() => void bootApp()} onUseMock={handleUseMock} />;
  }

  if (!patient) {
    return <LoadingScreen text="患者情報を読み込んでいます。" />;
  }

  const screenTitle =
    activeTab === "home"
      ? `こんにちは、${patient.name}`
      : activeTab === "reserve"
        ? "予約"
        : activeTab === "payment"
          ? "支払い"
          : "マイページ";

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={handleTabChange}
      title={screenTitle}
      showBack={history.length > 1}
      onBack={handleBack}
      patient={patient}
    >
      {activeTab === "home" && <HomeScreen navigate={navigate} patient={patient} liffState={liffState} />}
      {activeTab === "reserve" && <ReserveScreen />}
      {activeTab === "payment" && <PaymentScreen />}
      {activeTab === "mypage" && <MyPageScreen patient={patient} profile={profile} />}
    </AppShell>
  );
}
