"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      fontFamily: "system-ui, sans-serif",
      background: "#f1f5f9",
      color: "#0f172a",
    }}>
      <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Bir hata oluştu</h1>
      <pre style={{
        padding: 16,
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        maxWidth: 560,
        overflow: "auto",
        fontSize: 13,
        marginBottom: 16,
      }}>
        {error.message}
      </pre>
      <button
        type="button"
        onClick={reset}
        style={{
          padding: "8px 16px",
          background: "#6366f1",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        Tekrar dene
      </button>
    </div>
  );
}
