
// term-detail.jsx
function TermDetail({ term, allTerms, bookmarks, onBookmark, memos, onMemo, onSelectTerm, onClose }) {
  const [memoText, setMemoText] = React.useState("");
  const [memoSaved, setMemoSaved] = React.useState(false);

  React.useEffect(() => {
    if (term) setMemoText(memos[term.id] || "");
  }, [term?.id]);

  if (!term) return null;

  const cat = window.CATEGORIES[term.category];
  const isBookmarked = bookmarks.has(term.id);
  const relatedTerms = (term.related || []).map(id => allTerms.find(t => t.id === id)).filter(Boolean);

  const handleMemoSave = () => {
    onMemo(term.id, memoText);
    setMemoSaved(true);
    setTimeout(() => setMemoSaved(false), 1500);
  };

  const stars = Array.from({ length: 5 }, (_, i) => i < (term.frequency || 0));

  return (
    <div style={detailStyles.panel}>
      <div style={detailStyles.header}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flex: 1, minWidth: 0 }}>
          <div style={{ ...detailStyles.catBadge, background: cat?.bg, color: cat?.color, borderColor: cat?.color + "40" }}>
            {cat?.label}
          </div>
        </div>
        <button onClick={onClose} style={detailStyles.closeBtn} title="閉じる">✕</button>
      </div>

      <div style={detailStyles.titleRow}>
        <h2 style={detailStyles.termName}>{term.name}</h2>
        <button
          onClick={() => onBookmark(term.id)}
          style={{ ...detailStyles.bookmarkBtn, color: isBookmarked ? "#F59E0B" : "#CBD5E1" }}
          title={isBookmarked ? "ブックマーク解除" : "ブックマーク"}
        >
          {isBookmarked ? "★" : "☆"}
        </button>
      </div>

      {term.reading && (
        <div style={detailStyles.reading}>{term.reading}</div>
      )}

      <div style={detailStyles.freqRow}>
        <span style={detailStyles.freqLabel}>出題頻度</span>
        <span style={{ display: "flex", gap: 2 }}>
          {stars.map((filled, i) => (
            <span key={i} style={{ color: filled ? "#F59E0B" : "#E2E8F0", fontSize: 16 }}>★</span>
          ))}
        </span>
      </div>

      <p style={detailStyles.description}>{term.description}</p>

      {term.exam_tip && (
        <div style={detailStyles.tipBox}>
          <span style={detailStyles.tipIcon}>💡</span>
          <span style={detailStyles.tipText}>{term.exam_tip}</span>
        </div>
      )}

      {relatedTerms.length > 0 && (
        <div style={detailStyles.section}>
          <div style={detailStyles.sectionTitle}>関連用語</div>
          <div style={detailStyles.relatedWrap}>
            {relatedTerms.map(rt => {
              const rc = window.CATEGORIES[rt.category];
              return (
                <button
                  key={rt.id}
                  onClick={() => onSelectTerm(rt.id)}
                  style={{ ...detailStyles.relatedChip, background: rc?.bg, color: rc?.color, borderColor: rc?.color + "50" }}
                >
                  {rt.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={detailStyles.section}>
        <div style={detailStyles.sectionTitle}>メモ</div>
        <textarea
          value={memoText}
          onChange={e => setMemoText(e.target.value)}
          placeholder="自由にメモを書けます..."
          style={detailStyles.textarea}
          rows={3}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
          <button onClick={handleMemoSave} style={detailStyles.saveBtn}>
            {memoSaved ? "✓ 保存済" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

const detailStyles = {
  panel: {
    height: "100%", overflowY: "auto", padding: "20px 18px",
    fontFamily: "'Noto Sans JP', sans-serif",
    display: "flex", flexDirection: "column", gap: 0,
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginBottom: 10, gap: 8,
  },
  catBadge: {
    fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
    border: "1px solid", letterSpacing: 0.3, whiteSpace: "nowrap",
  },
  closeBtn: {
    background: "none", border: "none", cursor: "pointer", fontSize: 16,
    color: "#94A3B8", padding: "2px 6px", borderRadius: 4,
    flexShrink: 0, lineHeight: 1,
  },
  titleRow: {
    display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 2,
  },
  termName: {
    margin: 0, fontSize: 22, fontWeight: 800, color: "#0F172A",
    lineHeight: 1.3, flex: 1,
  },
  bookmarkBtn: {
    background: "none", border: "none", cursor: "pointer",
    fontSize: 24, padding: "0 2px", transition: "color 0.2s", flexShrink: 0,
  },
  reading: {
    fontSize: 12, color: "#94A3B8", marginBottom: 10, letterSpacing: 0.5,
  },
  freqRow: {
    display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
  },
  freqLabel: {
    fontSize: 11, fontWeight: 600, color: "#64748B",
    background: "#F1F5F9", padding: "2px 8px", borderRadius: 4,
  },
  description: {
    fontSize: 13.5, lineHeight: 1.85, color: "#334155",
    margin: "0 0 14px 0", textWrap: "pretty",
  },
  tipBox: {
    display: "flex", gap: 8, alignItems: "flex-start",
    background: "#FFFBEB", border: "1px solid #FDE68A",
    borderRadius: 8, padding: "10px 12px", marginBottom: 16,
  },
  tipIcon: { fontSize: 14, flexShrink: 0, marginTop: 1 },
  tipText: { fontSize: 12.5, color: "#92400E", lineHeight: 1.7 },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 11, fontWeight: 700, color: "#64748B",
    textTransform: "uppercase", letterSpacing: 0.8,
    marginBottom: 8, borderBottom: "1px solid #F1F5F9", paddingBottom: 4,
  },
  relatedWrap: { display: "flex", flexWrap: "wrap", gap: 6 },
  relatedChip: {
    fontSize: 12, fontWeight: 600, padding: "4px 10px",
    borderRadius: 20, border: "1px solid", cursor: "pointer",
    transition: "opacity 0.15s", background: "none",
    fontFamily: "'Noto Sans JP', sans-serif",
  },
  textarea: {
    width: "100%", boxSizing: "border-box",
    border: "1px solid #E2E8F0", borderRadius: 8,
    padding: "8px 10px", fontSize: 13, color: "#334155",
    fontFamily: "'Noto Sans JP', sans-serif",
    resize: "vertical", outline: "none",
    background: "#FAFBFC", lineHeight: 1.7,
  },
  saveBtn: {
    background: "#3B82F6", color: "#fff", border: "none",
    borderRadius: 6, padding: "5px 14px", fontSize: 12,
    fontWeight: 600, cursor: "pointer",
    fontFamily: "'Noto Sans JP', sans-serif",
    transition: "background 0.2s",
  },
};

window.TermDetail = TermDetail;
