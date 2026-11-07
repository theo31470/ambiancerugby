export type Competition = {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  country: string | null;
  kind: "league" | "cup" | "international";
  current_season: string;
  standings_mode: "computed" | "api" | "none";
  oanor_id: string | null;
  apisports_id: number | null;
  apisports_name: string | null;
  color: string | null;
  logo_url: string | null;
  sort_order: number;
  is_featured: boolean;
};

export type Team = {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  abbreviation: string | null;
  aliases: string[];
  country: string | null;
  city: string | null;
  stadium: string | null;
  founded: number | null;
  logo_url: string | null;
  color: string | null;
  description: string | null;
  is_national: boolean;
};

export type TeamLite = Pick<Team, "id" | "slug" | "name" | "short_name" | "abbreviation" | "logo_url" | "color">;

export type MatchStatus = "scheduled" | "live" | "halftime" | "finished" | "postponed" | "cancelled";

export type Match = {
  id: string;
  competition_id: string;
  season: string;
  round: string | null;
  kickoff_at: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  home_tries: number | null;
  away_tries: number | null;
  status: MatchStatus;
  clock: string | null;
  venue: string | null;
  tv: string | null;
  linescores: unknown;
  source: "manual" | "oanor" | "apisports";
};

export type MatchFull = Match & {
  home: TeamLite;
  away: TeamLite;
  competition: Pick<Competition, "id" | "slug" | "name" | "short_name" | "color">;
};

export type StandingRow = {
  rank: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points_for: number;
  points_against: number;
  tries_for: number | null;
  tries_against: number | null;
  bonus: number;
  points: number;
  form: string | null;
  team: TeamLite;
};

export type Player = {
  id: string;
  slug: string;
  first_name: string;
  last_name: string;
  team_id: string | null;
  position: string | null;
  number: number | null;
  nationality: string | null;
  birth_date: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  photo_url: string | null;
  bio: string | null;
  caps: number | null;
  career_points: number | null;
  career_tries: number | null;
};

export type Article = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_url: string | null;
  category: string;
  competition_id: string | null;
  team_id: string | null;
  author_id: string | null;
  status: "draft" | "published";
  premium: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MatchEvent = {
  id: string;
  match_id: string;
  minute: number | null;
  kind: string;
  team_id: string | null;
  player_id: string | null;
  text: string | null;
};
