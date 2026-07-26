import PageShell from "@/app/components/PageShell";
import BookRunPlanner from "@/app/components/BookRunPlanner";

export default function BookRunPage() {
  return (
    <PageShell narrow>
      <BookRunPlanner findHref="/search" />
    </PageShell>
  );
}
