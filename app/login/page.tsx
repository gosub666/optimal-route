"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form action={formAction} className="w-full max-w-sm space-y-4">
        <h1 className="text-xl font-bold text-[#185FA5]">이음국세 로그인</h1>
        <p className="text-sm text-gray-500">
          관리자가 등록한 이름과 전화번호로 로그인하세요.
        </p>

        <div className="space-y-1">
          <label className="text-sm font-medium">이름</label>
          <input
            name="name"
            required
            className="w-full border rounded-lg px-3 py-2"
            placeholder="홍길동"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">전화번호</label>
          <input
            name="phone"
            required
            inputMode="numeric"
            className="w-full border rounded-lg px-3 py-2"
            placeholder="01012345678"
          />
        </div>

        {state.error && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}

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
