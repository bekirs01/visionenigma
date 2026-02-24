import dynamic from "next/dynamic";

const HomePageClient = dynamic(() => import("./HomePageClient"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#f1f5f9",
        color: "#0f172a",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Support MVP</h1>
      <p style={{ color: "#64748b" }}>Yükleniyor…</p>
    </div>
  ),
});

export default function HomePage() {
  return <HomePageClient />;
}
