import Link from "next/link";

export default function DashboardCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <div
        style={{
          marginBottom: "16px",
          padding: "20px",
          borderRadius: "12px",
          background: "#111827",
          border: "1px solid #1f2937",
          cursor: "pointer",
        }}
      >
        <h3 style={{ fontSize: "18px", marginBottom: "6px" }}>{title}</h3>
        <p style={{ opacity: 0.7 }}>{description}</p>
      </div>
    </Link>
  );
}
