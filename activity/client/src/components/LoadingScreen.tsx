interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = "Connexion en cours..." }: LoadingScreenProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        color: "#fff",
        gap: 24,
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #e94560, #f5a623)",
          animation: "pulse 1.5s ease-in-out infinite",
          boxShadow: "0 0 30px rgba(233, 69, 96, 0.5)",
        }}
      />
      <div style={{ textAlign: "center" }}>
        <h2
          style={{
            fontSize: 24,
            fontWeight: 700,
            marginBottom: 8,
            letterSpacing: "0.05em",
          }}
        >
          Marble Race
        </h2>
        <p style={{ fontSize: 14, opacity: 0.7 }}>{message}</p>
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
