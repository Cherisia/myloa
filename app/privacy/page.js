export const metadata = {
  title: '개인정보처리방침',
  description: 'myloa의 개인정보 수집 항목, 이용 목적, 보유 기간 및 이용자 권리를 안내합니다.',
  alternates: { canonical: 'https://myloa.app/privacy' },
}

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto py-10 px-2">
      <h1 className="text-2xl ns-bold text-gray-900 dark:text-zinc-100 mb-2">개인정보처리방침</h1>
      <p className="text-xs text-gray-400 dark:text-zinc-500 mb-8">최종 업데이트: 2026년 5월 27일</p>

      <Section title="1. 수집하는 개인정보">
        <p>myloa는 서비스 제공을 위해 아래의 정보를 수집합니다.</p>
        <ul>
          <li><b>Discord 로그인 시:</b> Discord 사용자 ID, 닉네임, 프로필 이미지 URL, 이메일 주소</li>
          <li><b>서비스 이용 중:</b> 로스트아크 캐릭터 정보(캐릭터명, 직업, 아이템레벨, 전투력), 레이드 진행 현황, 그룹·길드 데이터</li>
          <li><b>로스트아크 API 키 (선택):</b> 캐릭터 동기화를 위해 입력하는 API 키는 AES-256으로 암호화하여 저장되며, 복호화 후 로스트아크 공식 API 호출에만 사용됩니다.</li>
        </ul>
      </Section>

      <Section title="2. 개인정보 수집 목적">
        <ul>
          <li>서비스 로그인 및 본인 확인</li>
          <li>레이드 숙제 관리 데이터 저장 및 동기화</li>
          <li>그룹·길드 기능 제공</li>
          <li>서비스 품질 개선</li>
        </ul>
      </Section>

      <Section title="3. 개인정보 보유 및 이용기간">
        <p>수집된 개인정보는 서비스 탈퇴 또는 삭제 요청 시 즉시 파기합니다. 단, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.</p>
      </Section>

      <Section title="4. 제3자 제공">
        <p>myloa는 수집한 개인정보를 원칙적으로 외부에 제공하지 않습니다. 단, 아래의 경우는 예외입니다.</p>
        <ul>
          <li>법령에 따른 수사기관 요청</li>
          <li>서비스 운영을 위한 하위 처리자 (아래 참조)</li>
        </ul>
      </Section>

      <Section title="5. 외부 서비스 (제3자 처리자)">
        <ul>
          <li><b>Discord:</b> OAuth 로그인 제공 — <a href="https://discord.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-500)] hover:underline">Discord 개인정보처리방침</a></li>
          <li><b>Neon (PostgreSQL):</b> 데이터베이스 호스팅</li>
          <li><b>Vercel:</b> 서버 호스팅</li>
          <li><b>Google AdSense:</b> 광고 표시를 위해 Google이 쿠키를 사용할 수 있습니다. Google의 광고 및 개인정보 관련 정책은 <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-500)] hover:underline">Google 개인정보처리방침</a>을 참고하세요. Google 광고 맞춤 설정은 <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-500)] hover:underline">광고 설정</a>에서 변경할 수 있습니다.</li>
        </ul>
      </Section>

      <Section title="6. 쿠키(Cookie) 사용">
        <p>myloa는 로그인 세션 유지 및 테마 설정 저장을 위해 쿠키와 로컬 스토리지를 사용합니다. 또한 Google AdSense 광고 제공을 위해 Google의 쿠키가 사용될 수 있습니다.</p>
        <p className="mt-2">브라우저 설정에서 쿠키를 비활성화할 수 있으나, 이 경우 일부 서비스 기능이 제한될 수 있습니다.</p>
      </Section>

      <Section title="7. 이용자의 권리">
        <p>이용자는 언제든지 아래의 권리를 행사할 수 있습니다.</p>
        <ul>
          <li>개인정보 열람 요청</li>
          <li>개인정보 수정·삭제 요청</li>
          <li>서비스 탈퇴 및 계정 삭제</li>
        </ul>
        <p className="mt-2">계정 삭제는 서비스 내 설정 페이지 또는 아래 문의처를 통해 요청하실 수 있습니다.</p>
      </Section>

      <Section title="8. 개인정보 보호책임자 및 문의">
        <p>개인정보 관련 문의는 아래로 연락해주세요.</p>
        <ul>
          <li>서비스명: myloa</li>
          <li>문의: <a href="https://github.com/cwwagg/myloa/issues" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-500)] hover:underline">GitHub Issues</a></li>
        </ul>
      </Section>

      <Section title="9. 개인정보처리방침 변경">
        <p>이 방침은 법령 또는 서비스 변경에 따라 수정될 수 있으며, 변경 시 본 페이지를 통해 공지합니다.</p>
      </Section>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="text-sm ns-bold text-gray-800 dark:text-zinc-200 mb-3">{title}</h2>
      <div className="text-sm text-gray-600 dark:text-zinc-400 leading-relaxed space-y-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
        {children}
      </div>
    </section>
  )
}
