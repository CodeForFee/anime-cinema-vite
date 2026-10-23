import { Link } from "@tanstack/react-router";

/** Empty list: a row of glass poster outlines where the titles will go, one line, one way out */
export function EmptyShelf({ line, hint }: { line: string; hint: string }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`glass-card aspect-[2/3] rounded-2xl ${i > 2 ? "hidden sm:block" : ""}`}
            style={{ opacity: 1 - i * 0.16 }}
          />
        ))}
      </div>
      <div>
        <p className="font-display text-lg font-semibold text-white">{line}</p>
        <p className="mt-1 text-sm text-gray-400">
          {hint}{" "}
          <Link to="/explore" className="font-semibold text-white underline decoration-white/30 underline-offset-4 hover:decoration-white">
            Khám phá phim
          </Link>
        </p>
      </div>
    </div>
  );
}
