import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { isAdminSession } from "@/lib/session";
import { createTeam, deleteTeam } from "./actions";

export default async function AdminTeamsPage() {
  const ok = await isAdminSession();
  if (!ok) redirect("/admin/login");

  const supabase = createServerSupabase();
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, created_at, members(count)")
    .order("created_at", { ascending: true });

  return (
    <main className="max-w-xl mx-auto px-6 py-8 space-y-6">
      <h1 className="text-xl font-bold text-[#185FA5]">팀 관리</h1>

      <form action={createTeam} className="flex gap-2">
        <input
          name="name"
          required
          placeholder="새 팀명"
          className="flex-1 border rounded-lg px-3 py-2"
        />
        <button className="bg-[#185FA5] text-white rounded-lg px-4 py-2">
          팀 추가
        </button>
      </form>

      <ul className="divide-y border rounded-lg overflow-hidden">
        {(teams ?? []).map((team) => (
          <li key={team.id} className="flex items-center justify-between px-4 py-3">
            <Link href={`/admin/teams/${team.id}`} className="font-medium">
              {team.name}{" "}
              <span className="text-sm text-gray-500">
                ({team.members?.[0]?.count ?? 0}명)
              </span>
            </Link>
            <form
              action={async () => {
                "use server";
                await deleteTeam(team.id);
              }}
            >
              <button className="text-sm text-red-600">삭제</button>
            </form>
          </li>
        ))}
        {(!teams || teams.length === 0) && (
          <li className="px-4 py-6 text-center text-gray-400 text-sm">
            등록된 팀이 없습니다.
          </li>
        )}
      </ul>
    </main>
  );
}
