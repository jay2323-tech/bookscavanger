export default function StatCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: "20px",
        borderRadius: "14px",
        background: "#0b1220",
        border: "1px solid #1f2937",
      }}
    >
      <p style={{ opacity: 0.7, marginBottom: "6px" }}>{title}</p>
      <h2 style={{ fontSize: "26px", fontWeight: "600" }}>{value}</h2>
    </div>
  );
}
