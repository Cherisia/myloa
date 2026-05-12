export default function DashboardLoading() {
  return (
    <>
      <style>{`
        @keyframes bar-wave {
          0%, 100% { transform: scaleY(0.3); opacity: 0.4; }
          50%       { transform: scaleY(1);   opacity: 1;   }
        }
      `}</style>

      {/* top/left/right/bottom + 100dvh: 모바일 주소창 등에서 inset-0만으로 남는 하단 여백 방지 */}
      <div
        className="fixed z-[100] flex w-full max-w-none items-center justify-center overscroll-none bg-slate-50 dark:bg-[#181818]"
        style={{
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          minHeight: '100dvh',
          height: '100dvh',
        }}
      >
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
