// The docket pane's state contract: what the pane draws from, held in $.state so a hot reload keeps it.

export type DocketItem = {
  // The id slot as written: `89`, or `24 (follow-ups)` for a slice that references #24 without allocating it.
  idPart: string;
  id: number;
  // The heading title with its trailing `(YYYY-MM-DD…)` group stripped, as the HTML board displays it.
  title: string;
  // The first date in that stripped group; null when the heading carries none.
  date: string | null;
  // Everything under the heading up to the next `##`/`###` heading, `#### Status` follow-ups included, trimmed.
  body: string;
};

export type DocketSection = {
  name: string;
  items: DocketItem[];
  // Top-level bullets outside any item (the `## Loose threads` shape), one string per bullet.
  threads: string[];
};

export type DocketBoard =
  | {
      kind: 'found';
      // The directory holding `docket/` (or the legacy `BACKLOG.md`).
      root: string;
      // Absolute path of the file parsed: `<root>/docket/DOCKET.md` or `<root>/BACKLOG.md`.
      file: string;
      layout: 'docket' | 'legacy';
      mtimeMs: number;
      sections: DocketSection[];
      // docket.json's `next_id`: ids are never reused, so everything ever logged is `nextId - 1`. Null for a legacy
      // BACKLOG.md board, or when docket.json is missing or unreadable.
      nextId: number | null;
      // Items closed per week, oldest first, the last being this week, read from the archive; null where there is none.
      weeklyCloses: number[] | null;
    }
  | { kind: 'missing'; searchedFrom: string }
  | { kind: 'unreadable'; file: string; reason: string };

declare module 'claude-code' {
  interface PluginState {
    docket: {
      // null until the first load finishes: the pane's pending state.
      board: DocketBoard | null;
      // The idParts whose bodies are expanded.
      expanded: string[];
      // The desktop's filter box: items whose id or title lacks this text are hidden.
      filter: string;
    };
  }
}
