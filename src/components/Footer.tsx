import { ThemeToggle } from "./ThemeToggle";

const CONTRIBUTORS = ["yoon6yo", "dongmin0204"];
const GITHUB_URL = "https://github.com/yoon6yo/dongguk-timetable-fe";
const FEEDBACK_EMAIL = "yukyum06@gmail.com";

export function Footer() {
  return (
    <footer className="mt-8 border-t border-neutral/20 px-4 py-4 text-center text-xs text-text-secondary">
      <p className="flex items-center justify-center gap-2">
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
          GitHub
        </a>
        {" · "}
        <a href={`mailto:${FEEDBACK_EMAIL}`} className="hover:text-primary">
          피드백 보내기
        </a>
        {" · "}
        <ThemeToggle />
      </p>
      <p className="mt-1">Contributors: {CONTRIBUTORS.join(", ")}</p>
    </footer>
  );
}
