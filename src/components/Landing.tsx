import Link from "next/link";

const UTILITY_LINKS: { href: string; label: string }[] = [
  { href: "/watchlist", label: "관심 강의 경쟁률" },
  { href: "/saved", label: "저장된 시간표" },
];

/**
 * Split layout (left: content, right: solid-color panel), not a small
 * centered block in a sea of white -- the previous version put the hero at
 * the top of a max-w-2xl column with nothing below it, which read as an
 * unfinished page floating in empty space (direct user feedback). No
 * external photo asset here (unlike the admin_fe reference this borrows the
 * split-panel idea from) -- this is a public repo, so the right panel is
 * built entirely from this app's own tokens instead of a licensed image.
 */
export function Landing() {
  return (
    <div className="flex flex-col lg:min-h-[85vh] lg:flex-row">
      <div className="flex flex-1 flex-col justify-center px-4 py-16 sm:px-8 lg:px-16 lg:py-10">
        <div className="mx-auto flex w-full max-w-md flex-col">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" />
            동국대학교
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">시간표 마법사</h1>
          <p className="mt-2 text-sm text-text-secondary">
            그룹을 만들고 과목을 담으면, 충돌 없는 시간표 조합을 자동으로 찾아드립니다.
          </p>

          <Link
            href="/wizard"
            className="mt-6 w-fit rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-button transition-all duration-150 hover:bg-primary-hover active:scale-95 active:bg-primary-active active:shadow-none"
          >
            시간표 만들기 시작
          </Link>

          {/* Demoted from card-grid feature tiles to plain text links --
              these are secondary utilities, not on par with the primary CTA
              (Karrot principle: one accent, one clear action per screen). */}
          <div className="mt-8 flex gap-4 border-t border-neutral/20 pt-4 text-xs font-medium text-text-secondary">
            {UTILITY_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-primary">
                {link.label} →
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Tinted, not solid-filled -- a full-width orange block would compete
          with the primary CTA for the screen's one scarce accent (DESIGN.md
          §1 Principle 1). Stacked below the CTA on mobile (as a bounded
          card, not edge-to-edge) instead of hidden -- hiding it left mobile
          with the exact same "floating in empty space" problem this whole
          redesign is meant to fix, just without a right-hand panel to blame. */}
      <div className="mx-4 mb-10 mt-2 rounded-lg bg-primary-tint px-6 py-8 sm:mx-8 lg:mx-0 lg:mb-0 lg:mt-0 lg:flex lg:w-2/5 lg:flex-col lg:justify-center lg:rounded-none lg:px-12 lg:py-0">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Every semester</p>
        <p className="mt-3 text-2xl font-bold leading-snug text-foreground">
          공강도, 이동 거리도,
          <br />
          경쟁률까지 계산해서
          <br />
          가장 나은 조합만.
        </p>
      </div>
    </div>
  );
}
