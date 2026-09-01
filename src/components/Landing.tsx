import Link from "next/link";

const FEATURES: { href: string; title: string; description: string }[] = [
  {
    href: "/watchlist",
    title: "관심 강의 경쟁률",
    description: "시간표에 담지 않은 과목도 검색해서 경쟁률만 따로 확인해보세요.",
  },
  {
    href: "/saved",
    title: "저장된 시간표",
    description: "마음에 드는 조합을 저장해두고 나중에 다시 꺼내볼 수 있어요.",
  },
];

export function Landing() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col px-4 py-10 text-center">
      <h1 className="text-2xl font-bold">동국대 시간표 마법사</h1>
      <p className="mt-2 text-sm text-text-secondary">
        그룹을 만들고 과목을 담으면, 충돌 없는 시간표 조합을 자동으로 찾아드립니다.
      </p>

      <Link
        href="/wizard"
        className="mx-auto mt-6 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-button transition-all duration-150 hover:bg-primary-hover active:scale-95 active:bg-primary-active active:shadow-none"
      >
        시간표 만들기 시작
      </Link>

      <div className="mt-6 grid gap-3 text-left sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <Link
            key={feature.href}
            href={feature.href}
            className="block rounded-lg bg-surface p-4 shadow-card transition-all duration-150 hover:shadow-card-hover active:scale-[0.98]"
          >
            <h2 className="text-sm font-semibold">{feature.title}</h2>
            <p className="mt-1 text-xs text-text-secondary">{feature.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
