export default function BrowseCard({
    title,
    author,
  }: {
    title: string
    author: string
  }) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-[#D4AF37] transition">
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-gray-400">{author}</p>
      </div>
    )
  }
  