import detail from "@/core/source/endpoints/detail/parse";
import episodes from "@/core/source/endpoints/episodes/parse";
import home from "@/core/source/endpoints/home/parse";
import list from "@/core/source/endpoints/list/parse";
import menu from "@/core/source/endpoints/menu/parse";
import ranking from "@/core/source/endpoints/ranking/parse";

/** Every page parser of the source, by name: the platform runs them (a worker on the web), tests call them directly */
export const parsers = { detail, episodes, home, list, menu, ranking };

export type Parsers = typeof parsers;
export type ParserName = keyof Parsers;
