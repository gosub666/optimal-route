import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
      <h1 className="text-2xl font-bold text-[#185FA5]">이음국세</h1>
      <p className="text-sm text-gray-500">국세 현장 도우미 (개발 중)</p>
      <div className="flex gap-3">
        <Link
          href="/login"
          className="bg-[#185FA5] text-white rounded-lg px-4 py-2 text-sm"
        >
          팀원 로그인
        </Link>
        <Link
          href="/admin/login"
          className="border border-[#185FA5] text-[#185FA5] rounded-lg px-4 py-2 text-sm"
        >
          관리자
        </Link>
      </div>
    </main>
  );
}
