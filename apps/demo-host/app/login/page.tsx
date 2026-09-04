"use client";

import { useState } from "react";

/**
 * 데모 로그인 화면이다.
 *
 * 계정을 화면에 적어 둔다. 감추면 데모를 처음 여는 사람이 막히고, 감춘다고 안전해
 * 지지도 않는다 — 이 로그인은 진짜가 아니다(`lib/session.ts`).
 */
export default function LoginPage() {
  const [id, setId] = useState("admin");
  const [password, setPassword] = useState("admin");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, password }),
      });
      if (!response.ok) {
        setError((await response.json() as { error: string }).error);
        return;
      }
      // 로그인 뒤에는 통째로 다시 읽는다. 서버가 그린 껍데기가 로그인 상태를
      // 알아야 하므로 클라이언트 이동으로는 부족하다.
      const next = new URLSearchParams(location.search).get("next");
      location.href = next !== null && next.startsWith("/") ? next : "/";
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={(event) => { void submit(event); }}>
        <div className="login-brand">
          <span className="login-mark">R</span>
          <div>
            <strong>ISU 인사 시스템</strong>
            <p>report-tool 데모 호스트</p>
          </div>
        </div>

        <label className="login-field">
          <span>아이디</span>
          <input value={id} onChange={(event) => setId(event.currentTarget.value)} autoFocus />
        </label>

        <label className="login-field">
          <span>비밀번호</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
          />
        </label>

        {error === "" ? null : <p className="login-error">{error}</p>}

        <button className="login-submit" type="submit" disabled={busy}>
          {busy ? "확인 중…" : "로그인"}
        </button>

        <p className="login-hint">
          데모 계정 <code>admin</code> / <code>admin</code> — 코드에 적힌 값입니다.
          실제 인증이 아닙니다.
        </p>
      </form>
    </div>
  );
}
