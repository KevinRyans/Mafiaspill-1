import { FormEvent, useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "../lib/api"
import { setAccessToken, setCsrfToken, setRole } from "../lib/auth"

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [totp, setTotp] = useState("")
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false)
  const [error, setError] = useState("")

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError("")
    try {
      const response = await api.post("/auth/login", {
        email,
        password,
        totp: totp || undefined
      })

      if (response.data.requiresTwoFactor) {
        setRequiresTwoFactor(true)
        return
      }

      setAccessToken(response.data.accessToken)
      setCsrfToken(response.data.csrfToken)
      setRole(response.data.user.role)
      navigate("/")
    } catch (err: any) {
      setError(err.response?.data?.message || "Innlogging feilet")
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg items-center px-4">
      <form onSubmit={onSubmit} className="glass w-full rounded-3xl p-8 shadow-card">
        <h1 className="text-3xl font-bold text-white">Logg inn</h1>
        <p className="mt-2 text-sm text-mist/70">Innlogging er fiktiv. Bruk seed-demo eller lag ny bruker.</p>
        <div className="mt-6 flex flex-col gap-4">
          <input
            className="rounded-xl bg-coal/70 px-4 py-3 text-sm text-white"
            placeholder="Epost"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="rounded-xl bg-coal/70 px-4 py-3 text-sm text-white"
            placeholder="Passord"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {requiresTwoFactor ? (
            <input
              className="rounded-xl bg-coal/70 px-4 py-3 text-sm text-white"
              placeholder="2FA kode"
              value={totp}
              onChange={(e) => setTotp(e.target.value)}
            />
          ) : null}
        </div>
        {error ? <p className="mt-3 text-sm text-ember">{error}</p> : null}
        <button className="mt-6 w-full rounded-xl bg-neon/20 py-3 text-sm font-semibold text-neon">
          Logg inn
        </button>
        <button
          type="button"
          onClick={() => navigate("/register")}
          className="mt-3 w-full rounded-xl border border-white/10 py-3 text-sm text-mist/70"
        >
          Registrer ny konto
        </button>
      </form>
    </div>
  )
}
