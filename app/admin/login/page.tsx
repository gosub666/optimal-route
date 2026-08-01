"use client";

import { useActionState } from "react";
import { adminLoginAction, type AdminLoginState } from "./actions";

const initialState: AdminLoginState = {};

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(adminLoginAction, initialState);

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form action={formAction} className="w-full max-w-sm space-y-4">
        <h1 className="text-xl font-bold text-[#185FA5]">관리자 로그인</h1>

        <div className="space-y-1">
          <label className="text-sm font-medium">비밀번호</label>
          <input
            name="password"
            type="password"
            required
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-[#185FA5] text-white rounded-lg py-2 font-medium disabled:opacity-50"
        >
          {pending ? "확인 중..." : "로그인"}
        </button>
      </form>
    </main>
  );
}
