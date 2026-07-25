interface Props {
  role: 'librarian' | 'customer'
  setRole: (role: 'librarian' | 'customer') => void
}

export default function RoleSelector({ role, setRole }: Props) {
  return (
    <div className="relative mb-6 h-9 rounded-full bg-transparent/50 backdrop-blur-md p-[2px]">
      
      {/* Selection pill */}
      <div
        className={`absolute top-[2px] left-[2px] h-[calc(100%-4px)] w-1/2 rounded-full
          bg-white/80 transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)]
          ${role === 'customer' ? 'translate-x-full' : ''}
        `}
      />

      <div className="relative z-10 flex h-full">
        <button
          onClick={() => setRole('librarian')}
          className={`flex-1 text-sm font-medium transition-colors
            ${role === 'librarian' ? 'text-black' : 'text-white/70'}
          `}
        >
          Librarian
        </button>

        <button
          onClick={() => setRole('customer')}
          className={`flex-1 text-sm font-medium transition-colors
            ${role === 'customer' ? 'text-black' : 'text-white/70'}
          `}
        >
          Customer
        </button>
      </div>
    </div>
  )
}
