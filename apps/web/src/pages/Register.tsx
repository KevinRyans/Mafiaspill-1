import { FormEvent, useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "../lib/api"
import { setAccessToken, setCsrfToken, setRole } from "../lib/auth"

export default function Register() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [verificationToken, setVerificationToken] = useState("")
  const [error, setError] = useState("")

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError("")
    try {
      const response = await api.post("/auth/register", { email, password, displayName })
      setAccessToken(response.data.accessToken)
      setCsrfToken(response.data.csrfToken)
      setRole(response.data.user.role)
      setVerificationToken(response.data.verificationToken)
      navigate("/")
    } catch (err: any) {
      setError(err.response?.data?.message || "Registrering feilet")
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg items-center px-4">
      <form onSubmit={onSubmit} className="glass w-full rounded-3xl p-8 shadow-card">
        <h1 className="text-3xl font-bold text-white">Registrer deg</h1>
        <p className="mt-2 text-sm text-mist/70">Alt er fiktivt. Ingen ekte kriminalitet.</p>
        <div className="mt-6 flex flex-col gap-4">
          <input
            className="rounded-xl bg-coal/70 px-4 py-3 text-sm text-white"
            placeholder="Visningsnavn"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <input
            className="rounded-xl bg-coal/70 px-4 py-3 text-sm text-white"
            placeholder="Epost"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="rounded-xl bg-coal/70 px-4 py-3 text-sm text-white"
            placeholder="Passord (min 8 tegn)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error ? <p className="mt-3 text-sm text-ember">{error}</p> : null}
        {verificationToken ? (
          <div className="mt-4 rounded-xl border border-white/10 p-3 text-xs text-mist/70">
            Mock-verifiseringstoken: <span className="text-neon">{verificationToken}</span>
          </div>
        ) : null}
        <button className="mt-6 w-full rounded-xl bg-neon/20 py-3 text-sm font-semibold text-neon">
          Registrer
        </button>
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="mt-3 w-full rounded-xl border border-white/10 py-3 text-sm text-mist/70"
        >
          Tilbake til innlogging
        </button>
      </form>
    </div>
  )
}
