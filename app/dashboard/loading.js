export default function DashboardLoading() {
  return (
    <>
      <style>{`
        @keyframes bar-wave {
          0%, 100% { transform: scaleY(0.3); opacity: 0.4; }
          50%       { transform: scaleY(1);   opacity: 1;   }
        }
      `}</style>

      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/5 dark:bg-[#0d1117]/10">
        <div className="flex items-end gap-1.5" style={{ height: 28 }}>
          {[0, 0.15, 0.3, 0.15, 0].map((delay, i) => (
            <div
              key={i}
              style={{
                width: 4,
                height: '100%',
                borderRadius: 9999,
                backgroundColor: '#facc15',
                transformOrigin: 'bottom',
                animation: `bar-wave 0.9s ease-in-out infinite`,
                animationDelay: `${delay}s`,
              }}
            />
          ))}
        </div>
      </div>
    </>
  )
}
