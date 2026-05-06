
// App.jsx
const { useState, useEffect, useMemo, useRef } = React;

const STORAGE_BOOKMARKS = "ouyou_bookmarks";
const STORAGE_MEMOS = "ouyou_memos";

function App() {
  const [selectedId, setSelectedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState("graph"); // "graph" | "list" | "bookmarks"
  const [activeCategories, setActiveCategories] = useState(new Set(Object.keys(window.CATEGORIES)));
  const [bookmarks, setBookmarks] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(STORAGE_BOOKMARKS) || "[]")); }
    catch { return new Set(); }
  });
  const [memos, setMemos] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_MEMOS) || "{}"); }
    catch { return {}; }
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  const selectedTerm = useMemo(() => window.TERMS.find(t => t.id === selectedId), [selectedId]);

  const handleBookmark = (id) => {
    setBookmarks(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem(STORAGE_BOOKMARKS, JSON.stringify([...next]));
      return next;
    });
  };

  const handleMemo = (id, text) => {
    setMemos(prev => {
      const next = { ...prev, [id]: text };
      localStorage.setItem(STORAGE_MEMOS, JSON.stringify(next));
      return next;
    });
  };

  const toggleCategory = (catId) => {
    setActiveCategories(prev => {
      const next = new Set(prev);
      if (next.size === Object.keys(window.CATEGORIES).length) {
        return new Set([catId]);
      }
      next.has(catId) ? next.delete(catId) : next.add(catId);
      if (next.size === 0) return new Set(Object.keys(window.CATEGORIES));
      return next;
    });
  };

  const resetCategories = () => setActiveCategories(new Set(Object.keys(window.CATEGORIES)));

  const filteredTerms = useMemo(() => {
    let terms = window.TERMS.filter(t => activeCategories.has(t.category));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      terms = terms.filter(t =>
        t.name.includes(searchQuery) ||
        t.reading?.includes(q) ||
        t.description?.toLowerCase().includes(q)
      );
    }
    if (view === "bookmarks") terms = terms.filter(t => bookmarks.has(t.id));
    return terms;
  }, [searchQuery, activeCategories, bookmarks, view]);

  const allActive = activeCategories.size === Object.keys(window.CATEGORIES).length;
  const mobileStacked = isMobile && !!selectedTerm;

  return (
    <div style={appStyles.root}>
      {/* Header */}
      <header style={appStyles.header}>
        <div style={appStyles.headerLeft}>
          <button style={appStyles.menuBtn} onClick={() => setSidebarOpen(v => !v)}>
            <span style={appStyles.menuIcon}>☰</span>
          </button>
          <div style={appStyles.logo}>
            <span style={appStyles.logoMark}>応情</span>
            <span style={appStyles.logoText}>用語まるわかりくん</span>
          </div>
        </div>

        <div style={appStyles.searchWrap}>
          <span style={appStyles.searchIcon}>🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="用語を検索..."
            style={appStyles.searchInput}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} style={appStyles.clearBtn}>✕</button>
          )}
        </div>

        <nav style={appStyles.nav}>
          {[
            { key: "graph", label: "グラフ", icon: "◉" },
            { key: "list", label: "一覧", icon: "≡" },
            { key: "bookmarks", label: `ブックマーク ${bookmarks.size > 0 ? `(${bookmarks.size})` : ""}`, icon: "★" },
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              style={{ ...appStyles.navBtn, ...(view === key ? appStyles.navBtnActive : {}) }}
            >
              <span style={{ marginRight: 4 }}>{icon}</span>
              {!isMobile && label}
            </button>
          ))}
        </nav>
      </header>

      <div style={{ ...appStyles.body, ...(mobileStacked ? { flexDirection: "column" } : {}) }}>
        {/* Sidebar */}
        <aside style={{ ...appStyles.sidebar, ...(sidebarOpen ? {} : appStyles.sidebarHidden), ...(mobileStacked ? { display: "none" } : {}) }}>
          <div style={appStyles.sidebarTitle}>
            <span>カテゴリ</span>
            {!allActive && (
              <button onClick={resetCategories} style={appStyles.resetBtn}>すべて</button>
            )}
          </div>
          {Object.entries(window.CATEGORIES).map(([id, cat]) => {
            const count = window.TERMS.filter(t => t.category === id).length;
            const active = activeCategories.has(id);
            return (
              <button
                key={id}
                onClick={() => toggleCategory(id)}
                style={{
                  ...appStyles.catBtn,
                  background: active ? cat.bg : "#F8FAFC",
                  borderColor: active ? cat.color + "60" : "#E2E8F0",
                  opacity: active ? 1 : 0.5,
                }}
              >
                <span style={{ ...appStyles.catDot, background: cat.color }} />
                <span style={{ flex: 1, textAlign: "left", fontSize: 12.5, color: "#334155", fontWeight: active ? 600 : 400 }}>
                  {cat.label}
                </span>
                <span style={{ ...appStyles.catCount, background: cat.color + "20", color: cat.color }}>{count}</span>
              </button>
            );
          })}
          <div style={appStyles.sidebarFooter}>
            <span style={{ fontSize: 11, color: "#94A3B8" }}>全{window.TERMS.length}用語</span>
          </div>
        </aside>

        {/* Main content */}
        <main style={{ ...appStyles.main, ...(mobileStacked ? { minHeight: 0 } : {}) }}>
          {view === "graph" && (
            <div style={appStyles.graphArea}>
              <GraphView
                selectedId={selectedId}
                onSelect={setSelectedId}
                searchQuery={searchQuery}
                activeCategories={activeCategories}
              />
              {!selectedId && !searchQuery && (
                <div style={appStyles.hint}>
                  ノードをクリックして用語を探索 • スクロールでズーム • ドラッグで移動
                </div>
              )}
              {searchQuery && (
                <div style={appStyles.searchBadge}>
                  「{searchQuery}」の検索結果: {filteredTerms.length}件
                </div>
              )}
            </div>
          )}

          {(view === "list" || view === "bookmarks") && (
            <div style={appStyles.listArea}>
              <div style={appStyles.listHeader}>
                <span style={appStyles.listCount}>
                  {view === "bookmarks" ? `ブックマーク ${filteredTerms.length}件` : `${filteredTerms.length}件`}
                </span>
                {view === "bookmarks" && filteredTerms.length === 0 && (
                  <span style={{ fontSize: 13, color: "#94A3B8" }}>★をクリックしてブックマークに追加できます</span>
                )}
              </div>
              <div style={appStyles.listGrid}>
                {filteredTerms.map(term => {
                  const cat = window.CATEGORIES[term.category];
                  const isSelected = term.id === selectedId;
                  const isBookmarked = bookmarks.has(term.id);
                  return (
                    <div
                      key={term.id}
                      onClick={() => { setSelectedId(term.id); if (isMobile) setView("graph"); }}
                      style={{
                        ...appStyles.termCard,
                        borderColor: isSelected ? cat?.color : "#E2E8F0",
                        boxShadow: isSelected ? `0 0 0 2px ${cat?.color}40` : "0 1px 3px rgba(0,0,0,0.06)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <span style={{ ...appStyles.termCardBadge, background: cat?.bg, color: cat?.color }}>{cat?.label}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: 10, color: "#F59E0B" }}>{"★".repeat(term.frequency || 0)}</span>
                          <button
                            onClick={e => { e.stopPropagation(); handleBookmark(term.id); }}
                            style={{ background: "none", border: "none", cursor: "pointer", color: isBookmarked ? "#F59E0B" : "#CBD5E1", fontSize: 15, padding: 0 }}
                          >
                            {isBookmarked ? "★" : "☆"}
                          </button>
                        </div>
                      </div>
                      <div style={appStyles.termCardName}>{term.name}</div>
                      <div style={appStyles.termCardDesc}>{term.description?.slice(0, 60)}…</div>
                      {memos[term.id] && (
                        <div style={appStyles.termCardMemo}>📝 {memos[term.id].slice(0, 30)}{memos[term.id].length > 30 ? "…" : ""}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>

        {/* Detail panel */}
        {selectedTerm && (
          <aside style={{
            ...appStyles.detailPanel,
            ...(isMobile ? appStyles.detailPanelMobileStacked : {}),
          }}>
            <TermDetail
              term={selectedTerm}
              allTerms={window.TERMS}
              bookmarks={bookmarks}
              onBookmark={handleBookmark}
              memos={memos}
              onMemo={handleMemo}
              onSelectTerm={setSelectedId}
              onClose={() => setSelectedId(null)}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

const appStyles = {
  root: {
    display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden",
    fontFamily: "'Noto Sans JP', sans-serif",
    background: "#F8FAFC", color: "#0F172A",
  },
  header: {
    display: "flex", alignItems: "center", gap: 12, padding: "0 16px",
    height: 56, background: "#fff", borderBottom: "1px solid #E2E8F0",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)", zIndex: 100, flexShrink: 0,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 10, flexShrink: 0 },
  menuBtn: {
    background: "none", border: "none", cursor: "pointer",
    padding: "4px 6px", borderRadius: 6, color: "#64748B",
  },
  menuIcon: { fontSize: 18, lineHeight: 1 },
  logo: { display: "flex", alignItems: "center", gap: 8 },
  logoMark: {
    background: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
    color: "#fff", fontWeight: 900, fontSize: 13,
    padding: "3px 7px", borderRadius: 6, letterSpacing: -0.3,
  },
  logoText: { fontWeight: 700, fontSize: 14, color: "#1E293B", whiteSpace: "nowrap" },
  searchWrap: {
    flex: 1, display: "flex", alignItems: "center", gap: 8,
    background: "#F1F5F9", borderRadius: 10, padding: "0 12px",
    height: 36, maxWidth: 400,
  },
  searchIcon: { fontSize: 13, color: "#94A3B8" },
  searchInput: {
    flex: 1, border: "none", background: "none", outline: "none",
    fontSize: 13.5, color: "#334155", fontFamily: "'Noto Sans JP', sans-serif",
  },
  clearBtn: {
    background: "none", border: "none", cursor: "pointer",
    color: "#94A3B8", fontSize: 12, padding: "0 2px",
  },
  nav: { display: "flex", gap: 4, flexShrink: 0 },
  navBtn: {
    display: "flex", alignItems: "center", gap: 4,
    background: "none", border: "none", cursor: "pointer",
    fontSize: 13, fontWeight: 500, color: "#64748B",
    padding: "6px 12px", borderRadius: 8,
    fontFamily: "'Noto Sans JP', sans-serif",
    transition: "background 0.15s, color 0.15s",
    whiteSpace: "nowrap",
  },
  navBtnActive: {
    background: "#EFF6FF", color: "#3B82F6", fontWeight: 700,
  },
  body: { display: "flex", flex: 1, overflow: "hidden" },
  sidebar: {
    width: 188, flexShrink: 0, background: "#fff",
    borderRight: "1px solid #E2E8F0", overflowY: "auto",
    padding: "12px 10px", display: "flex", flexDirection: "column", gap: 4,
    transition: "width 0.2s, padding 0.2s",
  },
  sidebarHidden: { width: 0, padding: 0, overflow: "hidden" },
  sidebarTitle: {
    fontSize: 11, fontWeight: 700, color: "#94A3B8",
    textTransform: "uppercase", letterSpacing: 0.8,
    padding: "4px 4px 8px", display: "flex", justifyContent: "space-between", alignItems: "center",
  },
  resetBtn: {
    background: "none", border: "1px solid #E2E8F0", borderRadius: 4,
    fontSize: 10, color: "#64748B", cursor: "pointer", padding: "1px 6px",
  },
  catBtn: {
    display: "flex", alignItems: "center", gap: 7,
    background: "none", border: "1px solid", borderRadius: 8,
    cursor: "pointer", padding: "6px 8px",
    transition: "opacity 0.15s, background 0.15s",
    fontFamily: "'Noto Sans JP', sans-serif",
    width: "100%",
  },
  catDot: { width: 9, height: 9, borderRadius: "50%", flexShrink: 0 },
  catCount: {
    fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10, flexShrink: 0,
  },
  sidebarFooter: { marginTop: "auto", padding: "8px 4px 2px", borderTop: "1px solid #F1F5F9" },
  main: { flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" },
  graphArea: { flex: 1, position: "relative", overflow: "hidden" },
  hint: {
    position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
    background: "rgba(15,23,42,0.7)", color: "#fff",
    fontSize: 12, padding: "6px 16px", borderRadius: 20,
    backdropFilter: "blur(4px)", pointerEvents: "none", whiteSpace: "nowrap",
  },
  searchBadge: {
    position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)",
    background: "#EFF6FF", color: "#3B82F6", border: "1px solid #BFDBFE",
    fontSize: 12, fontWeight: 600, padding: "4px 14px", borderRadius: 20,
    pointerEvents: "none", whiteSpace: "nowrap",
  },
  listArea: { flex: 1, overflowY: "auto", padding: 16 },
  listHeader: {
    display: "flex", alignItems: "center", gap: 12,
    marginBottom: 12, padding: "0 2px",
  },
  listCount: { fontSize: 12, fontWeight: 700, color: "#64748B" },
  listGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: 10,
  },
  termCard: {
    background: "#fff", border: "1.5px solid", borderRadius: 12,
    padding: "12px 14px", cursor: "pointer",
    transition: "box-shadow 0.15s, border-color 0.15s",
  },
  termCardBadge: {
    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
  },
  termCardName: { fontSize: 14.5, fontWeight: 700, color: "#0F172A", margin: "4px 0 4px" },
  termCardDesc: { fontSize: 11.5, color: "#64748B", lineHeight: 1.6 },
  termCardMemo: {
    marginTop: 6, fontSize: 11, color: "#78716C",
    background: "#FAFAF9", padding: "3px 7px", borderRadius: 4,
  },
  detailPanel: {
    width: 300, flexShrink: 0, background: "#fff",
    borderLeft: "1px solid #E2E8F0",
    boxShadow: "-2px 0 12px rgba(0,0,0,0.06)",
    overflowY: "auto",
  },
  detailPanelMobileStacked: {
    width: "100%",
    height: "42vh",
    borderLeft: "none",
    borderBottom: "1px solid #E2E8F0",
    boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
    flexShrink: 0,
    order: -1,
  },
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
