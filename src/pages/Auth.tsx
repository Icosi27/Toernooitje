import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { resetPassword, signIn, signUp } from "../logic/auth";
import { nlError } from "../logic/errors";

/** Registreren (/registreren) en inloggen (/login) voor organisatoren. */
export default function Auth() {
  const nav = useNavigate();
  const loc = useLocation();
  const register = loc.pathname.includes("registreren");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (register) {
        const { needsConfirmation } = await signUp(email.trim(), password, name.trim());
        if (needsConfirmation) {
          setInfo(
            "Bijna klaar! We hebben je een e-mail gestuurd — klik op de bevestigingslink en log daarna in."
          );
        } else {
          nav("/app");
        }
      } else {
        await signIn(email.trim(), password);
        nav("/app");
      }
    } catch (e) {
      setError(nlError(e));
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (!email.trim()) {
      setError("Vul eerst je e-mailadres in, dan sturen we een herstel-link.");
      return;
    }
    setError(null);
    try {
      await resetPassword(email.trim());
      setInfo("We hebben je een e-mail gestuurd om je wachtwoord opnieuw in te stellen.");
    } catch (e) {
      setError(nlError(e));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="accent-header px-4 py-3 text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-black">🏆 Toernooitje</Link>
        </div>
      </nav>

      <div className="mx-auto mt-12 max-w-md px-4">
        <div className="card p-8">
          <h1 className="text-2xl font-black tracking-tight">
            {register ? "Account aanmaken" : "Inloggen"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {register
              ? "Gratis account voor organisatoren. Je kunt daarna op elk apparaat bij je toernooien."
              : "Welkom terug! Log in om verder te gaan met je toernooien."}
          </p>

          {info ? (
            <div className="mt-6 rounded bg-green-50 p-4 text-sm text-green-800">
              ✅ {info}
              {register && (
                <div className="mt-3">
                  <Link to="/login" className="font-semibold underline">Naar inloggen</Link>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {register && (
                <div>
                  <label className="label">Naam</label>
                  <input
                    className="input"
                    value={name}
                    autoFocus
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              )}
              <div>
                <label className="label">E-mailadres</label>
                <input
                  type="email"
                  className="input"
                  value={email}
                  autoFocus={!register}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Wachtwoord {register && "(minimaal 6 tekens)"}</label>
                <input
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              {register && password.length > 0 && password.length < 6 && (
                <p className="text-xs text-slate-500">
                  Nog {6 - password.length} teken{6 - password.length === 1 ? "" : "s"} — een
                  wachtwoord is minimaal 6 tekens lang.
                </p>
              )}
              <button
                className="btn-primary w-full"
                // de 6-tekens-eis geldt alleen bij registreren: een bestaand
                // (ouder/kort) wachtwoord moet altijd ingevuld kunnen worden
                disabled={
                  busy ||
                  !email.trim() ||
                  (register ? password.length < 6 || !name.trim() : !password)
                }
                onClick={submit}
              >
                {busy ? "Bezig…" : register ? "Registreren" : "Inloggen"}
              </button>
              {!register && (
                <button className="w-full cursor-pointer text-center text-xs text-slate-500 underline" onClick={forgot}>
                  Wachtwoord vergeten?
                </button>
              )}
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-sm text-slate-600">
          {register ? (
            <>
              Al een account?{" "}
              <Link to="/login" className="font-semibold underline" style={{ color: "var(--accent)" }}>
                Log in
              </Link>
            </>
          ) : (
            <>
              Nog geen account?{" "}
              <Link to="/registreren" className="font-semibold underline" style={{ color: "var(--accent)" }}>
                Registreer gratis
              </Link>
            </>
          )}
        </p>
        <p className="mt-6 text-center text-xs text-slate-400">
          Je kunt ook zonder account een toernooi opzetten:{" "}
          <Link to="/nieuw" className="underline">start direct</Link>. Met de registratie ga je
          akkoord met de <Link to="/voorwaarden" className="underline">voorwaarden</Link> en{" "}
          <Link to="/privacy" className="underline">privacyverklaring</Link>.
        </p>
      </div>
    </div>
  );
}
