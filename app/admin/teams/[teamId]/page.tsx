import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { isAdminSession } from "@/lib/session";
import { renameTeam, createMember, updateMember, deleteMember } from "../actions";
import { adminLogoutAction } from "../../logout-action";

export default async function AdminTeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const ok = await isAdminSession();
  if (!ok) redirect("/admin/login");

  const { teamId } = await params;
  const supabase = createServerSupabase();

  const { data: team } = await supabase
    .from("teams")
    .select("id, name")
    .eq("id", teamId)
    .maybeSingle();

  if (!team) redirect("/admin/teams");

  const { data: members } = await supabase
    .from("members")
    .select("id, name, phone")
    .eq("team_id", teamId)
    .order("created_at", { ascending: true });

  return (
    <main className="max-w-xl mx-auto px-6 py-8 space-y-8">
      <div>
        <div className="flex items-center justify-between">
          <a href="/admin/teams" className="text-sm text-gray-500">← 팀 목록</a>
          <form action={adminLogoutAction}>
            <button className="text-sm text-gray-500">로그아웃</button>
          </form>
        </div>
        <form
          action={async (formData) => {
            "use server";
            await renameTeam(teamId, formData);
          }}
          className="flex gap-2 mt-2"
        >
          <input
            name="name"
            defaultValue={team.name}
            required
            className="flex-1 border rounded-lg px-3 py-2 font-bold"
          />
          <button className="bg-[#185FA5] text-white rounded-lg px-4 py-2">저장</button>
        </form>
      </div>

      <section className="space-y-3">
        <h2 className="font-bold">팀원 추가</h2>
        <form
          action={async (formData) => {
            "use server";
            await createMember(teamId, formData);
          }}
          className="flex gap-2"
        >
          <input name="name" required placeholder="이름" className="w-24 border rounded-lg px-3 py-2" />
          <input
            name="phone"
            required
            inputMode="numeric"
            placeholder="전화번호"
            className="flex-1 border rounded-lg px-3 py-2"
          />
          <button className="bg-[#185FA5] text-white rounded-lg px-4 py-2">추가</button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold">팀원 목록 ({members?.length ?? 0}명)</h2>
        <ul className="divide-y border rounded-lg overflow-hidden">
          {(members ?? []).map((member) => (
            <li key={member.id} className="px-4 py-3 space-y-2">
              <form
                action={async (formData) => {
                  "use server";
                  await updateMember(member.id, teamId, formData);
                }}
                className="flex gap-2"
              >
                <input
                  name="name"
                  defaultValue={member.name}
                  required
                  className="w-24 border rounded-lg px-2 py-1 text-sm"
                />
                <input
                  name="phone"
                  defaultValue={member.phone}
                  required
                  inputMode="numeric"
                  className="flex-1 border rounded-lg px-2 py-1 text-sm"
                />
                <button className="text-sm text-[#185FA5]">저장</button>
              </form>
              <form
                action={async () => {
                  "use server";
                  await deleteMember(member.id, teamId);
                }}
              >
                <button className="text-sm text-red-600">삭제</button>
              </form>
            </li>
          ))}
          {(!members || members.length === 0) && (
            <li className="px-4 py-6 text-center text-gray-400 text-sm">
              등록된 팀원이 없습니다.
            </li>
          )}
        </ul>
      </section>
    </main>
  );
}
