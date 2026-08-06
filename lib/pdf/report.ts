import "server-only";
import { createElement } from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { COLUMNS, COLUMN_LABELS, type Card } from "../cards";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica" },
  title: { fontSize: 18, marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#666666", marginBottom: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, marginBottom: 8 },
  card: { marginBottom: 8, paddingBottom: 8, borderBottom: "1pt solid #eeeeee" },
  cardText: { marginBottom: 2 },
  cardMeta: { fontSize: 9, color: "#888888" },
  empty: { fontSize: 10, color: "#999999" },
});

/** Text-only, section-per-column PDF. Only called once a room is fully revealed. */
export function buildRetroReport(roomName: string | null, cards: Card[]) {
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return createElement(
    Document,
    null,
    createElement(
      Page,
      { size: "A4", style: styles.page },
      createElement(Text, { style: styles.title }, roomName ?? "Retrospective"),
      createElement(Text, { style: styles.subtitle }, `Exported ${dateStr}`),
      ...COLUMNS.map((column) => {
        const columnCards = cards.filter((card) => card.column === column);
        return createElement(
          View,
          { key: column, style: styles.section },
          createElement(Text, { style: styles.sectionTitle }, COLUMN_LABELS[column]),
          columnCards.length === 0
            ? createElement(Text, { style: styles.empty }, "No cards")
            : columnCards.map((card) => {
                const voteCount = card.reactions.reduce((sum, r) => sum + r.count, 0);
                const meta = [
                  card.authorDisplayName,
                  card.ownerName ? `Owner: ${card.ownerName}` : null,
                  voteCount > 0 ? `${voteCount} reaction${voteCount === 1 ? "" : "s"}` : null,
                  card.aiGenerated ? "AI suggested" : null,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return createElement(
                  View,
                  { key: card.id, style: styles.card },
                  createElement(Text, { style: styles.cardText }, card.text ?? ""),
                  createElement(Text, { style: styles.cardMeta }, meta),
                );
              }),
        );
      }),
    ),
  );
}
