/**
 * 카카오 로그인 버튼용 아이콘 (카카오 브랜드 컬러 #FEE500)
 * @see https://developers.kakao.com/docs/latest/ko/kakaologin/js#login
 */
export default function KakaoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      aria-hidden
    >
      <path
        fill="#191919"
        d="M12 3c-5.8 0-10.5 3.66-10.5 8.18 0 2.94 1.92 5.53 4.84 7.04-.22.8-.8 2.94-.92 3.42-.14.56.24.55.34.4.13-.2 2.1-2.58 2.95-3.63.47.07.95.1 1.44.1 5.8 0 10.5-3.66 10.5-8.18S17.8 3 12 3z"
      />
    </svg>
  )
}
