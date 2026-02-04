import bcrypt from "bcryptjs"
import { prisma } from "./client"

const missions = [
  {
    name: "Oslo: Skjult leveranse",
    description: "Abstrakt logistikk med tett tilsyn i sentrum.",
    category: "kriminalitet",
    tier: 1,
    energyCost: 10,
    baseReward: 14000000,
    baseRisk: 16,
    cooldownMinutes: 5,
    options: [
      { id: "shadow-route", label: "Skyggerute", riskDelta: 4, rewardMultiplier: 1.2, complianceImpact: -2 },
      { id: "steady-route", label: "Stabil linje", riskDelta: -3, rewardMultiplier: 0.9, complianceImpact: 1 }
    ]
  },
  {
    name: "Bergen: Havnelogistikk",
    description: "Koordiner fiktive containere uten å trigge varsler.",
    category: "organisert",
    tier: 1,
    energyCost: 12,
    baseReward: 17000000,
    baseRisk: 18,
    cooldownMinutes: 6,
    options: [
      { id: "fast-pass", label: "Rask omlasting", riskDelta: 6, rewardMultiplier: 1.3, complianceImpact: -3 },
      { id: "paper-trail", label: "Trygg papirflyt", riskDelta: -4, rewardMultiplier: 0.85, complianceImpact: 2 }
    ]
  },
  {
    name: "Trondheim: Arkivbytte",
    description: "Flytt fiktive dokumentmapper i et lukket nettverk.",
    category: "oppdrag",
    tier: 1,
    energyCost: 11,
    baseReward: 15500000,
    baseRisk: 15,
    cooldownMinutes: 5,
    options: [
      { id: "ghost-cache", label: "Ghost-cache", riskDelta: 3, rewardMultiplier: 1.15, complianceImpact: -1 },
      { id: "verified-chain", label: "Verifiserbar kjede", riskDelta: -2, rewardMultiplier: 0.95, complianceImpact: 2 }
    ]
  },
  {
    name: "Stavanger: Offshore-kode",
    description: "Simuler en risikoanalyse for en offshore-klient.",
    category: "organisert",
    tier: 2,
    energyCost: 15,
    baseReward: 22000000,
    baseRisk: 24,
    cooldownMinutes: 7,
    options: [
      { id: "aggressive-model", label: "Aggressiv modell", riskDelta: 7, rewardMultiplier: 1.35, complianceImpact: -4 },
      { id: "balanced-model", label: "Balansert modell", riskDelta: -1, rewardMultiplier: 1.0, complianceImpact: 1 }
    ]
  },
  {
    name: "Tromsø: Polarnettverk",
    description: "Bygg relasjoner i et kaldt, men åpent marked.",
    category: "oppdrag",
    tier: 2,
    energyCost: 14,
    baseReward: 21000000,
    baseRisk: 22,
    cooldownMinutes: 6,
    options: [
      { id: "silent-nodes", label: "Stille noder", riskDelta: 2, rewardMultiplier: 1.2, complianceImpact: -2 },
      { id: "open-channel", label: "Åpen kanal", riskDelta: -4, rewardMultiplier: 0.9, complianceImpact: 3 }
    ]
  },
  {
    name: "Oslo: Regulator-scan",
    description: "Avled oppmerksomhet gjennom fiktive compliance-runder.",
    category: "kriminalitet",
    tier: 2,
    energyCost: 16,
    baseReward: 23000000,
    baseRisk: 26,
    cooldownMinutes: 8,
    options: [
      { id: "noise-layer", label: "Støylag", riskDelta: 5, rewardMultiplier: 1.25, complianceImpact: -3 },
      { id: "audit-proof", label: "Revisjonsklar", riskDelta: -3, rewardMultiplier: 0.95, complianceImpact: 4 }
    ]
  },
  {
    name: "Bergen: Kunstsjekk",
    description: "Vurder abstrakt proveniens for et virtuelt galleri.",
    category: "oppdrag",
    tier: 2,
    energyCost: 13,
    baseReward: 19000000,
    baseRisk: 20,
    cooldownMinutes: 6,
    options: [
      { id: "fast-track", label: "Hurtigvurdering", riskDelta: 4, rewardMultiplier: 1.2, complianceImpact: -2 },
      { id: "deep-verify", label: "Dyp verifisering", riskDelta: -2, rewardMultiplier: 0.95, complianceImpact: 2 }
    ]
  },
  {
    name: "Trondheim: Datapassasje",
    description: "Flytt fiktive datapakker gjennom sikre noder.",
    category: "kriminalitet",
    tier: 2,
    energyCost: 15,
    baseReward: 21500000,
    baseRisk: 23,
    cooldownMinutes: 7,
    options: [
      { id: "micro-splits", label: "Mikro-splitt", riskDelta: 6, rewardMultiplier: 1.3, complianceImpact: -3 },
      { id: "clean-path", label: "Ren rute", riskDelta: -3, rewardMultiplier: 0.9, complianceImpact: 3 }
    ]
  },
  {
    name: "Stavanger: Risiko-ruting",
    description: "Optimaliser fiktive leveranser under høyt press.",
    category: "organisert",
    tier: 3,
    energyCost: 18,
    baseReward: 28000000,
    baseRisk: 30,
    cooldownMinutes: 9,
    options: [
      { id: "speed-burst", label: "Speed burst", riskDelta: 8, rewardMultiplier: 1.4, complianceImpact: -5 },
      { id: "steady-core", label: "Stabil kjerne", riskDelta: -4, rewardMultiplier: 0.95, complianceImpact: 2 }
    ]
  },
  {
    name: "Tromsø: Skyggeforhandling",
    description: "Forhandle om virtuelle markedsandeler i nord.",
    category: "oppdrag",
    tier: 3,
    energyCost: 17,
    baseReward: 26000000,
    baseRisk: 28,
    cooldownMinutes: 8,
    options: [
      { id: "bold-offer", label: "Dristig tilbud", riskDelta: 7, rewardMultiplier: 1.35, complianceImpact: -4 },
      { id: "quiet-offer", label: "Stille avtale", riskDelta: -2, rewardMultiplier: 1.0, complianceImpact: 1 }
    ]
  },
  {
    name: "Oslo: Krypto-konvoi",
    description: "Simuler flytting av tokens uten å trigge heat.",
    category: "kriminalitet",
    tier: 3,
    energyCost: 20,
    baseReward: 31000000,
    baseRisk: 34,
    cooldownMinutes: 10,
    options: [
      { id: "obscure-path", label: "Obscure path", riskDelta: 9, rewardMultiplier: 1.45, complianceImpact: -6 },
      { id: "compliance-first", label: "Compliance først", riskDelta: -5, rewardMultiplier: 0.9, complianceImpact: 4 }
    ]
  },
  {
    name: "Bergen: Nattlig mellomledd",
    description: "Koordiner fiktive mellomledd under lavt sikt.",
    category: "kriminalitet",
    tier: 2,
    energyCost: 14,
    baseReward: 20500000,
    baseRisk: 21,
    cooldownMinutes: 7,
    options: [
      { id: "silent-hubs", label: "Stille hubs", riskDelta: 5, rewardMultiplier: 1.25, complianceImpact: -3 },
      { id: "soft-landing", label: "Myk landing", riskDelta: -2, rewardMultiplier: 0.95, complianceImpact: 2 }
    ]
  },
  {
    name: "Biltyveri: Garasje-hugg",
    description: "Fiktiv henting av kjøretøy uten direkte konfrontasjon.",
    category: "biltyveri",
    tier: 1,
    energyCost: 9,
    baseReward: 12000000,
    baseRisk: 14,
    cooldownMinutes: 4,
    options: [
      { id: "quick-lift", label: "Rask løft", riskDelta: 5, rewardMultiplier: 1.2, complianceImpact: -2 },
      { id: "silent-roll", label: "Stille rull", riskDelta: -2, rewardMultiplier: 0.95, complianceImpact: 1 }
    ]
  },
  {
    name: "Biltyveri: Motorlinje",
    description: "Koordiner en trygg flyt av kjøretøy mellom noder.",
    category: "biltyveri",
    tier: 2,
    energyCost: 12,
    baseReward: 18000000,
    baseRisk: 19,
    cooldownMinutes: 5,
    options: [
      { id: "relay", label: "Relé", riskDelta: 4, rewardMultiplier: 1.15, complianceImpact: -2 },
      { id: "slow-pass", label: "Sakte passering", riskDelta: -3, rewardMultiplier: 0.9, complianceImpact: 2 }
    ]
  },
  {
    name: "Husran: Nattlogg",
    description: "Fiktivt innhentingsoppdrag i et stille nabolag.",
    category: "husran",
    tier: 1,
    energyCost: 10,
    baseReward: 15000000,
    baseRisk: 17,
    cooldownMinutes: 5,
    options: [
      { id: "lightstep", label: "Lettesteg", riskDelta: 3, rewardMultiplier: 1.1, complianceImpact: -1 },
      { id: "observe-first", label: "Observer først", riskDelta: -2, rewardMultiplier: 0.9, complianceImpact: 2 }
    ]
  },
  {
    name: "Husran: Loftsboks",
    description: "Hent ut fiktive verdipakker uten å trigge alarm.",
    category: "husran",
    tier: 2,
    energyCost: 13,
    baseReward: 19000000,
    baseRisk: 22,
    cooldownMinutes: 6,
    options: [
      { id: "tight-window", label: "Tett tidsrom", riskDelta: 5, rewardMultiplier: 1.2, complianceImpact: -3 },
      { id: "clean-exit", label: "Ren exit", riskDelta: -3, rewardMultiplier: 0.9, complianceImpact: 2 }
    ]
  },
  {
    name: "Fight club: Sparring",
    description: "Simulert kamptrening for å skjerpe forsvar.",
    category: "fight_club",
    tier: 1,
    energyCost: 8,
    baseReward: 9000000,
    baseRisk: 10,
    cooldownMinutes: 4,
    options: [
      { id: "discipline", label: "Disiplin", riskDelta: -2, rewardMultiplier: 0.8, complianceImpact: 2 },
      { id: "pressure", label: "Press", riskDelta: 4, rewardMultiplier: 1.1, complianceImpact: -1 }
    ]
  },
  {
    name: "Fight club: Arena",
    description: "Strategisk treningsøkt med høy innsats.",
    category: "fight_club",
    tier: 2,
    energyCost: 12,
    baseReward: 14000000,
    baseRisk: 16,
    cooldownMinutes: 6,
    options: [
      { id: "stamina", label: "Utholdenhet", riskDelta: -2, rewardMultiplier: 0.9, complianceImpact: 1 },
      { id: "power", label: "Kraft", riskDelta: 6, rewardMultiplier: 1.2, complianceImpact: -2 }
    ]
  },
  {
    name: "Ran spiller: Press",
    description: "Abstrakt konfrontasjon mellom spillere (ingen realistiske metoder).",
    category: "ran_spiller",
    tier: 2,
    energyCost: 14,
    baseReward: 20000000,
    baseRisk: 24,
    cooldownMinutes: 8,
    options: [
      { id: "direct", label: "Direkte press", riskDelta: 7, rewardMultiplier: 1.3, complianceImpact: -3 },
      { id: "subtle", label: "Diskré press", riskDelta: -2, rewardMultiplier: 0.9, complianceImpact: 2 }
    ]
  },
  {
    name: "Biltyveri: Byttegarasje",
    description: "Fiktiv utveksling av kjøretøy i skjermet område.",
    category: "biltyveri",
    tier: 1,
    energyCost: 10,
    baseReward: 13000000,
    baseRisk: 16,
    cooldownMinutes: 4,
    options: [
      { id: "quick-shift", label: "Rask bytte", riskDelta: 4, rewardMultiplier: 1.15, complianceImpact: -2 },
      { id: "cover-route", label: "Dekket rute", riskDelta: -2, rewardMultiplier: 0.9, complianceImpact: 2 }
    ]
  },
  {
    name: "Biltyveri: Havnerute",
    description: "Koordiner en diskret rute gjennom travle soner.",
    category: "biltyveri",
    tier: 3,
    energyCost: 16,
    baseReward: 26000000,
    baseRisk: 30,
    cooldownMinutes: 8,
    options: [
      { id: "rush-dock", label: "Hurtig dokk", riskDelta: 7, rewardMultiplier: 1.35, complianceImpact: -4 },
      { id: "slow-dock", label: "Rolig dokk", riskDelta: -4, rewardMultiplier: 0.95, complianceImpact: 2 }
    ]
  },
  {
    name: "Husran: Kjellerarkiv",
    description: "Hent ut fiktive mapper uten å trigge sensorsystem.",
    category: "husran",
    tier: 1,
    energyCost: 9,
    baseReward: 12000000,
    baseRisk: 14,
    cooldownMinutes: 5,
    options: [
      { id: "silent-entry", label: "Stille inngang", riskDelta: -2, rewardMultiplier: 0.9, complianceImpact: 2 },
      { id: "fast-exit", label: "Rask utgang", riskDelta: 4, rewardMultiplier: 1.2, complianceImpact: -2 }
    ]
  },
  {
    name: "Husran: Nabolagsskift",
    description: "Et fiktivt vindu åpner seg mens området er tomt.",
    category: "husran",
    tier: 3,
    energyCost: 17,
    baseReward: 25000000,
    baseRisk: 28,
    cooldownMinutes: 9,
    options: [
      { id: "window", label: "Kort vindu", riskDelta: 6, rewardMultiplier: 1.3, complianceImpact: -3 },
      { id: "patient", label: "Tålmodig", riskDelta: -3, rewardMultiplier: 0.95, complianceImpact: 2 }
    ]
  },
  {
    name: "Fight club: Taktisk sirkel",
    description: "Trening med fokus på posisjonering og forsvar.",
    category: "fight_club",
    tier: 3,
    energyCost: 16,
    baseReward: 18000000,
    baseRisk: 18,
    cooldownMinutes: 7,
    options: [
      { id: "guard", label: "Vaktmodus", riskDelta: -3, rewardMultiplier: 0.9, complianceImpact: 2 },
      { id: "aggress", label: "Aggressiv", riskDelta: 6, rewardMultiplier: 1.25, complianceImpact: -2 }
    ]
  },
  {
    name: "Ran spiller: Psykologisk press",
    description: "Rangert konfrontasjon uten detaljer fra virkeligheten.",
    category: "ran_spiller",
    tier: 3,
    energyCost: 18,
    baseReward: 26000000,
    baseRisk: 32,
    cooldownMinutes: 10,
    options: [
      { id: "shock", label: "Sjokk", riskDelta: 8, rewardMultiplier: 1.4, complianceImpact: -4 },
      { id: "patience", label: "Tålmodig press", riskDelta: -3, rewardMultiplier: 0.95, complianceImpact: 2 }
    ]
  },
  {
    name: "Kriminalitet: Signalbrudd",
    description: "Avledning av fiktive signaler for lavere heat.",
    category: "kriminalitet",
    tier: 1,
    energyCost: 9,
    baseReward: 13000000,
    baseRisk: 15,
    cooldownMinutes: 5,
    options: [
      { id: "noise", label: "Støyteppe", riskDelta: 5, rewardMultiplier: 1.2, complianceImpact: -2 },
      { id: "clean", label: "Ren linje", riskDelta: -2, rewardMultiplier: 0.9, complianceImpact: 2 }
    ]
  },
  {
    name: "Kriminalitet: Kontaktnett",
    description: "Fiktiv rute som bruker kontakter for dekning.",
    category: "kriminalitet",
    tier: 3,
    energyCost: 18,
    baseReward: 27500000,
    baseRisk: 30,
    cooldownMinutes: 9,
    options: [
      { id: "tight", label: "Tett nett", riskDelta: 7, rewardMultiplier: 1.3, complianceImpact: -3 },
      { id: "wide", label: "Bredt nett", riskDelta: -3, rewardMultiplier: 0.95, complianceImpact: 2 }
    ]
  },
  {
    name: "Oppdrag: Innsider-brief",
    description: "Simuler informasjonsinnhenting for et oppdrag.",
    category: "oppdrag",
    tier: 1,
    energyCost: 10,
    baseReward: 13500000,
    baseRisk: 16,
    cooldownMinutes: 5,
    options: [
      { id: "quick-read", label: "Hurtigbrief", riskDelta: 4, rewardMultiplier: 1.15, complianceImpact: -2 },
      { id: "deep-read", label: "Dypbrief", riskDelta: -2, rewardMultiplier: 0.95, complianceImpact: 2 }
    ]
  },
  {
    name: "Oppdrag: Sikkerhetsvindu",
    description: "Planlegg fiktiv timing uten å trigge varsler.",
    category: "oppdrag",
    tier: 2,
    energyCost: 14,
    baseReward: 20000000,
    baseRisk: 22,
    cooldownMinutes: 7,
    options: [
      { id: "tight-slot", label: "Tett slot", riskDelta: 5, rewardMultiplier: 1.25, complianceImpact: -3 },
      { id: "soft-slot", label: "Rolig slot", riskDelta: -3, rewardMultiplier: 0.95, complianceImpact: 2 }
    ]
  },
  {
    name: "Organisert: Fraktplan",
    description: "Fiktiv koordinering mellom flere lag.",
    category: "organisert",
    tier: 2,
    energyCost: 15,
    baseReward: 21500000,
    baseRisk: 23,
    cooldownMinutes: 7,
    options: [
      { id: "fast-chain", label: "Rask kjede", riskDelta: 6, rewardMultiplier: 1.3, complianceImpact: -3 },
      { id: "safe-chain", label: "Trygg kjede", riskDelta: -3, rewardMultiplier: 0.95, complianceImpact: 2 }
    ]
  },
  {
    name: "Organisert: Firmalinje",
    description: "Avstemt drift mellom fiktive firmaer.",
    category: "organisert",
    tier: 3,
    energyCost: 19,
    baseReward: 30000000,
    baseRisk: 32,
    cooldownMinutes: 10,
    options: [
      { id: "expedite", label: "Ekspeder", riskDelta: 8, rewardMultiplier: 1.4, complianceImpact: -4 },
      { id: "steady", label: "Stabil drift", riskDelta: -4, rewardMultiplier: 0.95, complianceImpact: 2 }
    ]
  },
  {
    name: "Kriminalitet: Kontrollpunkt",
    description: "Hold et fiktivt kontrollpunkt i balanse mens presset øker.",
    category: "kriminalitet",
    tier: 2,
    energyCost: 15,
    baseReward: 22000000,
    baseRisk: 24,
    cooldownMinutes: 7,
    options: [
      { id: "signal-fade", label: "Signal-fade", riskDelta: 5, rewardMultiplier: 1.25, complianceImpact: -3 },
      { id: "regelrydd", label: "Regelrydd", riskDelta: -3, rewardMultiplier: 0.95, complianceImpact: 3 }
    ]
  },
  {
    name: "Kriminalitet: Speilrute",
    description: "Kjør en fiktiv rute med dobbel overvåkning og lav feilmargin.",
    category: "kriminalitet",
    tier: 3,
    energyCost: 19,
    baseReward: 30000000,
    baseRisk: 32,
    cooldownMinutes: 9,
    options: [
      { id: "double-shield", label: "Dobbel skjold", riskDelta: 7, rewardMultiplier: 1.35, complianceImpact: -4 },
      { id: "patient-run", label: "Tålmodig løp", riskDelta: -4, rewardMultiplier: 0.9, complianceImpact: 2 }
    ]
  },
  {
    name: "Biltyveri: Fjordtunnel",
    description: "Flytt kjøretøy i et skjermet nettverk med få stopp.",
    category: "biltyveri",
    tier: 2,
    energyCost: 13,
    baseReward: 18000000,
    baseRisk: 20,
    cooldownMinutes: 6,
    options: [
      { id: "skjult-kjede", label: "Skjult kjede", riskDelta: 4, rewardMultiplier: 1.2, complianceImpact: -2 },
      { id: "rolig-skift", label: "Rolig skift", riskDelta: -3, rewardMultiplier: 0.9, complianceImpact: 2 }
    ]
  },
  {
    name: "Biltyveri: Kystlinje",
    description: "En lang fiktiv rute med høy gevinst og høy risiko.",
    category: "biltyveri",
    tier: 3,
    energyCost: 17,
    baseReward: 27000000,
    baseRisk: 30,
    cooldownMinutes: 8,
    options: [
      { id: "hurtig-linje", label: "Hurtig linje", riskDelta: 7, rewardMultiplier: 1.35, complianceImpact: -4 },
      { id: "sikker-linje", label: "Sikker linje", riskDelta: -4, rewardMultiplier: 0.95, complianceImpact: 2 }
    ]
  },
  {
    name: "Husran: Vaktbytte",
    description: "Utnytt et kort tidsvindu i et fiktivt nabolag.",
    category: "husran",
    tier: 2,
    energyCost: 14,
    baseReward: 20000000,
    baseRisk: 22,
    cooldownMinutes: 7,
    options: [
      { id: "hurtig-in", label: "Hurtig inn", riskDelta: 5, rewardMultiplier: 1.25, complianceImpact: -3 },
      { id: "rolig-ut", label: "Rolig ut", riskDelta: -3, rewardMultiplier: 0.95, complianceImpact: 2 }
    ]
  },
  {
    name: "Husran: Lydslør",
    description: "Fiktiv operasjon med fokus på lav signatur.",
    category: "husran",
    tier: 3,
    energyCost: 18,
    baseReward: 28000000,
    baseRisk: 30,
    cooldownMinutes: 9,
    options: [
      { id: "lydteppe", label: "Lydteppe", riskDelta: 6, rewardMultiplier: 1.3, complianceImpact: -3 },
      { id: "tyst-profil", label: "Tyst profil", riskDelta: -4, rewardMultiplier: 0.95, complianceImpact: 2 }
    ]
  },
  {
    name: "Oppdrag: Skyggelogistikk",
    description: "Fiktiv koordinering av ruter med lav synlighet.",
    category: "oppdrag",
    tier: 1,
    energyCost: 11,
    baseReward: 15000000,
    baseRisk: 16,
    cooldownMinutes: 5,
    options: [
      { id: "ghost-lane", label: "Ghost lane", riskDelta: 4, rewardMultiplier: 1.15, complianceImpact: -2 },
      { id: "clean-lane", label: "Ren lane", riskDelta: -2, rewardMultiplier: 0.95, complianceImpact: 2 }
    ]
  },
  {
    name: "Oppdrag: Kontrollrom",
    description: "Styr fiktive rutiner gjennom et travelt kontrollrom.",
    category: "oppdrag",
    tier: 3,
    energyCost: 18,
    baseReward: 29000000,
    baseRisk: 30,
    cooldownMinutes: 9,
    options: [
      { id: "tight-grid", label: "Tett rute", riskDelta: 7, rewardMultiplier: 1.35, complianceImpact: -4 },
      { id: "steady-grid", label: "Stabil rute", riskDelta: -4, rewardMultiplier: 0.95, complianceImpact: 2 }
    ]
  },
  {
    name: "Organisert: Sonekoordinering",
    description: "Hold flere fiktive lag synkronisert uten avvik.",
    category: "organisert",
    tier: 2,
    energyCost: 16,
    baseReward: 23000000,
    baseRisk: 24,
    cooldownMinutes: 7,
    options: [
      { id: "fast-sync", label: "Rask synk", riskDelta: 6, rewardMultiplier: 1.3, complianceImpact: -3 },
      { id: "safe-sync", label: "Trygg synk", riskDelta: -3, rewardMultiplier: 0.95, complianceImpact: 2 }
    ]
  },
  {
    name: "Organisert: Havnerytme",
    description: "Fiktiv timing mellom flere knutepunkt.",
    category: "organisert",
    tier: 3,
    energyCost: 20,
    baseReward: 32000000,
    baseRisk: 33,
    cooldownMinutes: 10,
    options: [
      { id: "pulse", label: "Pulse", riskDelta: 8, rewardMultiplier: 1.4, complianceImpact: -4 },
      { id: "steady", label: "Stabil rytme", riskDelta: -4, rewardMultiplier: 0.95, complianceImpact: 2 }
    ]
  },
  {
    name: "Ran spiller: Pressbølge",
    description: "Rangert konfrontasjon med høyt psykologisk trykk.",
    category: "ran_spiller",
    tier: 2,
    energyCost: 15,
    baseReward: 24000000,
    baseRisk: 25,
    cooldownMinutes: 8,
    options: [
      { id: "front", label: "Front", riskDelta: 7, rewardMultiplier: 1.3, complianceImpact: -3 },
      { id: "mask", label: "Maskering", riskDelta: -2, rewardMultiplier: 0.9, complianceImpact: 2 }
    ]
  },
  {
    name: "Ran spiller: Stillhet",
    description: "Diskré konfrontasjon uten detaljering.",
    category: "ran_spiller",
    tier: 3,
    energyCost: 19,
    baseReward: 31000000,
    baseRisk: 32,
    cooldownMinutes: 10,
    options: [
      { id: "silent", label: "Stille press", riskDelta: 8, rewardMultiplier: 1.4, complianceImpact: -4 },
      { id: "slow", label: "Sakte press", riskDelta: -3, rewardMultiplier: 0.95, complianceImpact: 2 }
    ]
  },
  {
    name: "Fight club: Guardline",
    description: "Trening med fokus på defensiv kontroll.",
    category: "fight_club",
    tier: 1,
    energyCost: 9,
    baseReward: 12000000,
    baseRisk: 12,
    cooldownMinutes: 5,
    options: [
      { id: "guard", label: "Guard", riskDelta: -2, rewardMultiplier: 0.9, complianceImpact: 2 },
      { id: "pressure", label: "Press", riskDelta: 4, rewardMultiplier: 1.1, complianceImpact: -1 }
    ]
  },
  {
    name: "Fight club: Taktisk press",
    description: "Skarp treningsøkt for å bygge forsvar raskt.",
    category: "fight_club",
    tier: 2,
    energyCost: 13,
    baseReward: 18000000,
    baseRisk: 18,
    cooldownMinutes: 6,
    options: [
      { id: "discipline", label: "Disiplin", riskDelta: -2, rewardMultiplier: 0.9, complianceImpact: 1 },
      { id: "attack", label: "Angrep", riskDelta: 6, rewardMultiplier: 1.2, complianceImpact: -2 }
    ]
  },
  {
    name: "Oppdrag: Arkivglass",
    description: "Diskré flytting av fiktive dokumenter i et lukket rom.",
    category: "oppdrag",
    tier: 1,
    energyCost: 9,
    baseReward: 13000000,
    baseRisk: 14,
    cooldownMinutes: 5,
    options: [
      { id: "silent-pull", label: "Stille uttak", riskDelta: 2, rewardMultiplier: 1.1, complianceImpact: -1 },
      { id: "audit-safe", label: "Revisjonsspor", riskDelta: -3, rewardMultiplier: 0.9, complianceImpact: 2 }
    ]
  },
  {
    name: "Oppdrag: Understrøm",
    description: "Styr fiktive strømmer uten å trigge varsler.",
    category: "oppdrag",
    tier: 2,
    energyCost: 12,
    baseReward: 20000000,
    baseRisk: 21,
    cooldownMinutes: 6,
    options: [
      { id: "fast-rail", label: "Rask linje", riskDelta: 5, rewardMultiplier: 1.25, complianceImpact: -3 },
      { id: "quiet-rail", label: "Stille linje", riskDelta: -2, rewardMultiplier: 0.95, complianceImpact: 2 }
    ]
  },
  {
    name: "Oppdrag: Dataskygge",
    description: "Masker bevegelse i et simulert dataspor.",
    category: "oppdrag",
    tier: 3,
    energyCost: 17,
    baseReward: 27000000,
    baseRisk: 29,
    cooldownMinutes: 8,
    options: [
      { id: "ghost-layer", label: "Ghost layer", riskDelta: 7, rewardMultiplier: 1.35, complianceImpact: -4 },
      { id: "clean-layer", label: "Ren layer", riskDelta: -3, rewardMultiplier: 0.95, complianceImpact: 2 }
    ]
  },
  {
    name: "Organisert: Fjordlinje",
    description: "Koordiner flere knutepunkt i et fiktivt rutenett.",
    category: "organisert",
    tier: 1,
    energyCost: 11,
    baseReward: 16500000,
    baseRisk: 17,
    cooldownMinutes: 6,
    options: [
      { id: "fjord-fast", label: "Hurtig rute", riskDelta: 5, rewardMultiplier: 1.2, complianceImpact: -2 },
      { id: "fjord-safe", label: "Trygg rute", riskDelta: -3, rewardMultiplier: 0.9, complianceImpact: 2 }
    ]
  },
  {
    name: "Organisert: Kjedeledd",
    description: "Sammenkoble fiktive aktører i en stabil kjede.",
    category: "organisert",
    tier: 2,
    energyCost: 15,
    baseReward: 23000000,
    baseRisk: 24,
    cooldownMinutes: 7,
    options: [
      { id: "sync-up", label: "Synk opp", riskDelta: 6, rewardMultiplier: 1.3, complianceImpact: -3 },
      { id: "steady-link", label: "Stabil lenke", riskDelta: -2, rewardMultiplier: 0.95, complianceImpact: 2 }
    ]
  },
  {
    name: "Organisert: Terminalvakt",
    description: "Kontroller et fiktivt terminalpunkt under høyt press.",
    category: "organisert",
    tier: 3,
    energyCost: 19,
    baseReward: 30000000,
    baseRisk: 31,
    cooldownMinutes: 9,
    options: [
      { id: "hard-lock", label: "Hard lock", riskDelta: 8, rewardMultiplier: 1.4, complianceImpact: -4 },
      { id: "soft-lock", label: "Soft lock", riskDelta: -4, rewardMultiplier: 0.95, complianceImpact: 2 }
    ]
  }
]
async function cleanupContent() {
  await prisma.prisonBreakAttempt.deleteMany()
  await prisma.prisonInmate.deleteMany()
  await prisma.deathLog.deleteMany()

  await prisma.travelQueue.deleteMany()
  await prisma.travelLog.deleteMany()
  await prisma.userLocation.deleteMany()

  await prisma.marketTransaction.deleteMany()
  await prisma.marketListing.deleteMany()
  await prisma.marketOrder.deleteMany()

  await prisma.contractProgress.deleteMany()
  await prisma.contractAssignment.deleteMany()
  await prisma.escrowTransaction.deleteMany()
  await prisma.dispute.deleteMany()
  await prisma.reputationRating.deleteMany()
  await prisma.contract.deleteMany()

  await prisma.gamblingResult.deleteMany()
  await prisma.gamblingBet.deleteMany()
  await prisma.gamblingGame.deleteMany()
  await prisma.gamblingLimit.deleteMany()
  await prisma.leaderboardCache.deleteMany()

  await prisma.business.deleteMany()

  await prisma.benefitPurchase.deleteMany()
  await prisma.respectPurchase.deleteMany()
  await prisma.respectUpgrade.deleteMany()

  await prisma.passiveRun.deleteMany()
  await prisma.passiveAction.deleteMany()

  await prisma.contactEvent.deleteMany()
  await prisma.userContact.deleteMany()
  await prisma.contact.deleteMany()

  await prisma.bankTransaction.deleteMany()
  await prisma.garageCar.deleteMany()
  await prisma.fightClubProfile.deleteMany()
  await prisma.carModel.deleteMany()

  await prisma.notification.deleteMany()
  await prisma.chatMessage.deleteMany()

  await prisma.itemInstance.deleteMany()
  await prisma.item.deleteMany()

  await prisma.missionEvent.deleteMany()
  await prisma.missionRun.deleteMany()
  await prisma.mission.deleteMany()

  await prisma.cityHeat.deleteMany()
  await prisma.cityState.deleteMany()
  await prisma.city.deleteMany()
}

async function main() {
  const adminEmail = "admin@mafiaspill.local"
  const playerEmail = "runner@mafiaspill.local"
  const passwordHash = await bcrypt.hash("ChangeMe123!", 10)

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: "admin",
      emailVerifiedAt: new Date(),
      profile: {
        upsert: {
          create: {
            displayName: "Kontrollrom-1",
            title: "Systemvokter",
            playstyle: "strategist",
            reputationTag: "overvåker",
            specialization: "compliance",
            respect: 80,
            respectSpent: 0,
            defense: 5000,
            notoriety: 900,
            risk: 20,
            heat: 10,
            compliance: 62,
            walletReputation: 70,
            fiatBalance: 1500000000,
            tokenBalance: 1500
          },
          update: {
            displayName: "Kontrollrom-1",
            title: "Systemvokter",
            playstyle: "strategist",
            reputationTag: "overvåker",
            specialization: "compliance",
            respect: 80,
            respectSpent: 0,
            defense: 5000,
            notoriety: 900,
            risk: 20,
            heat: 10,
            compliance: 62,
            walletReputation: 70,
            fiatBalance: 1500000000,
            tokenBalance: 1500
          }
        }
      }
    },
    create: {
      email: adminEmail,
      passwordHash,
      role: "admin",
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          displayName: "Kontrollrom-1",
          title: "Systemvokter",
          playstyle: "strategist",
          reputationTag: "overvåker",
          specialization: "compliance",
          respect: 80,
            respectSpent: 0,
            defense: 5000,
          notoriety: 900,
          risk: 20,
          heat: 10,
          compliance: 62,
          walletReputation: 70,
          fiatBalance: 1500000000,
          tokenBalance: 1500
        }
      },
      inventory: { create: {} }
    }
  })

  const player = await prisma.user.upsert({
    where: { email: playerEmail },
    update: {
      role: "player",
      emailVerifiedAt: new Date(),
      profile: {
        upsert: {
          create: {
            displayName: "Skumring",
            title: "Gateanalytiker",
            playstyle: "opportunist",
            reputationTag: "diskret",
            specialization: "marked",
            respect: 20,
            respectSpent: 0,
            defense: 3000,
            notoriety: 310,
            risk: 15,
            heat: 5,
            compliance: 55,
            walletReputation: 58,
            fiatBalance: 250000000,
            tokenBalance: 240
          },
          update: {
            displayName: "Skumring",
            title: "Gateanalytiker",
            playstyle: "opportunist",
            reputationTag: "diskret",
            specialization: "marked",
            respect: 20,
            respectSpent: 0,
            defense: 3000,
            notoriety: 310,
            risk: 15,
            heat: 5,
            compliance: 55,
            walletReputation: 58,
            fiatBalance: 250000000,
            tokenBalance: 240
          }
        }
      }
    },
    create: {
      email: playerEmail,
      passwordHash,
      role: "player",
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          displayName: "Skumring",
          title: "Gateanalytiker",
          playstyle: "opportunist",
          reputationTag: "diskret",
          specialization: "marked",
          respect: 20,
            respectSpent: 0,
            defense: 3000,
          notoriety: 310,
          risk: 15,
          heat: 5,
          compliance: 55,
          walletReputation: 58,
          fiatBalance: 250000000,
          tokenBalance: 240
        }
      },
      inventory: { create: {} }
    }
  })

  await cleanupContent()

  await prisma.fightClubProfile.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      style: "judo",
      rating: 420,
      judoStrength: 40,
      jujutsuStrength: 20,
      karateStrength: 18,
      taekwondoStrength: 16,
      league: "Veteran"
    }
  })

  await prisma.fightClubProfile.upsert({
    where: { userId: player.id },
    update: {},
    create: {
      userId: player.id,
      style: "karate",
      rating: 180,
      judoStrength: 14,
      jujutsuStrength: 12,
      karateStrength: 22,
      taekwondoStrength: 12,
      league: "Rookie"
    }
  })

  await prisma.item.createMany({
    data: [
      {
        name: "Provenans-arkiv",
        description: "Fiktiv kunstlogg som gir bonus i spillet.",
        category: "kunst",
        rarity: "rare",
        basePrice: 48000000,
        basePower: 2,
        provenanceBase: 70,
        isCraftable: true,
        craftMinutes: 45
      },
      {
        name: "Aurora Coupé",
        description: "Luksusbil for rask forflytning.",
        category: "kjøretøy",
        rarity: "epic",
        basePrice: 150000000,
        basePower: 6,
        provenanceBase: 60
      },
      {
        name: "Sensor-kit",
        description: "Reduserer risiko-score i oppdrag.",
        category: "gadget",
        rarity: "uncommon",
        basePrice: 22000000,
        basePower: 1,
        provenanceBase: 55,
        isCraftable: true,
        craftMinutes: 25
      },
      {
        name: "Signalforsterker",
        description: "Gir bedre kontakt-lojalitet i nettverk.",
        category: "gadget",
        rarity: "rare",
        basePrice: 52000000,
        basePower: 3,
        provenanceBase: 58
      },
      {
        name: "Nordlys-plakat",
        description: "Samleobjekt med lav risiko, høy stil.",
        category: "kunst",
        rarity: "common",
        basePrice: 14000000,
        basePower: 1,
        provenanceBase: 42
      }
    ],
    skipDuplicates: true
  })

  await prisma.carModel.createMany({
    data: [
      { make: "BMW", model: "M5", rarity: "epic", class: "luksus", baseValue: 180000000 },
      { make: "BMW", model: "M4", rarity: "rare", class: "sport", baseValue: 120000000 },
      { make: "Toyota", model: "Corolla", rarity: "common", class: "gate", baseValue: 30000000 },
      { make: "Volvo", model: "XC90", rarity: "uncommon", class: "SUV", baseValue: 70000000 },
      { make: "Audi", model: "RS6", rarity: "epic", class: "luksus", baseValue: 190000000 },
      { make: "Volkswagen", model: "Golf", rarity: "common", class: "gate", baseValue: 25000000 },
      { make: "Mercedes", model: "C63", rarity: "rare", class: "sport", baseValue: 140000000 },
      { make: "Ford", model: "Focus", rarity: "common", class: "gate", baseValue: 20000000 },
      { make: "Tesla", model: "Model S", rarity: "uncommon", class: "luksus", baseValue: 90000000 }
    ],
    skipDuplicates: true
  })

  const carModels = await prisma.carModel.findMany()
  const carMap = new Map(carModels.map((car) => [`${car.make}-${car.model}`, car.id]))

  const starterCar = carMap.get("Toyota-Corolla")
  if (starterCar) {
    await prisma.garageCar.create({
      data: {
        userId: player.id,
        carModelId: starterCar,
        source: "seed"
      }
    })
  }

  await prisma.respectUpgrade.createMany({
    data: [
      {
        code: "profit_crime",
        name: "Lønnsom kriminalitet",
        description: "Gir økt utbetaling på kriminalitet.",
        cost: 3,
        effectKey: "crime_payout",
        levelRequired: 0
      },
      {
        code: "learning_crime",
        name: "Lærerik kriminalitet",
        description: "Gir ekstra progresjon på kriminalitet.",
        cost: 10,
        effectKey: "crime_learning",
        levelRequired: 1
      },
      {
        code: "efficient_robbery",
        name: "Effektivt ran",
        description: "Bedre sjanse i spiller-ran.",
        cost: 4,
        effectKey: "robbery_success",
        levelRequired: 1
      },
      {
        code: "firm_boost",
        name: "Forbedret firmadrift",
        description: "Gir høyere inntekt fra firmaer.",
        cost: 15,
        effectKey: "business_income",
        levelRequired: 2
      },
      {
        code: "bribe_warden",
        name: "Bestikk fengselsdirektøren",
        description: "Bedre sjanse for fengselsbrudd.",
        cost: 8,
        effectKey: "prison_break",
        levelRequired: 1
      },
      {
        code: "efficient_training",
        name: "Effektiv trening",
        description: "Mer utbytte av fight club.",
        cost: 15,
        effectKey: "training_bonus",
        levelRequired: 2
      },
      {
        code: "efficient_trade",
        name: "Effektiv handel",
        description: "Små fordeler i markedet.",
        cost: 8,
        effectKey: "market_bonus",
        levelRequired: 1
      }
    ],
    skipDuplicates: true
  })

  const items = await prisma.item.findMany()
  const adminInventory = await prisma.inventory.findUnique({ where: { userId: admin.id } })
  const playerInventory = await prisma.inventory.findUnique({ where: { userId: player.id } })

  if (adminInventory && playerInventory) {
    await prisma.itemInstance.createMany({
      data: [
        {
          itemId: items[0].id,
          inventoryId: adminInventory.id,
          ownerId: admin.id,
          quantity: 1,
          provenanceScore: 72
        },
        {
          itemId: items[2].id,
          inventoryId: playerInventory.id,
          ownerId: player.id,
          quantity: 2,
          provenanceScore: 61
        }
      ],
      skipDuplicates: true
    })
  }

  const missionsWithCars = missions.map((mission) => {
    if (mission.name === "Oppdrag: Innsider-brief") {
      return { ...mission, requiredCarModelId: carMap.get("Toyota-Corolla") ?? null }
    }
    if (mission.name === "Oppdrag: Sikkerhetsvindu") {
      return { ...mission, requiredCarModelId: carMap.get("Audi-RS6") ?? null }
    }
    if (mission.name === "Oppdrag: Skyggelogistikk") {
      return { ...mission, requiredCarModelId: carMap.get("BMW-M4") ?? null }
    }
    if (mission.name === "Oppdrag: Kontrollrom") {
      return { ...mission, requiredCarModelId: carMap.get("BMW-M5") ?? null }
    }
    return mission
  })

  await prisma.mission.createMany({
    data: missionsWithCars,
    skipDuplicates: true
  })

  const cityNames = ["Oslo", "Bergen", "Trondheim", "Stavanger", "Tromsø"]

  await prisma.city.createMany({
    data: cityNames.map((name, index) => ({
      name,
      controlLevel: 50 + (index % 4) * 5,
      politicalPressure: 45 + (index % 3) * 6,
      economicHeat: 55 + (index % 5) * 4,
      riskIndex: 40 + (index % 6) * 5
    })),
    skipDuplicates: true
  })

  const cities = await prisma.city.findMany()
  await prisma.cityState.createMany({
    data: cities.map((city, index) => ({
      cityId: city.id,
      policePressure: 45 + (index % 4) * 6,
      marketMood: 55 + (index % 3) * 7,
      travelRisk: 15 + (index % 5) * 3
    })),
    skipDuplicates: true
  })

  await prisma.cityHeat.createMany({
    data: cities.map((city, index) => ({
      cityId: city.id,
      heat: 35 + (index % 3) * 12
    })),
    skipDuplicates: true
  })

  await prisma.userLocation.upsert({
    where: { userId: player.id },
    update: { cityId: cities[0]?.id },
    create: { userId: player.id, cityId: cities[0]?.id }
  })

  await prisma.prisonInmate.upsert({
    where: { userId: player.id },
    update: {
      cityId: cities[0]?.id,
      jailedUntil: new Date(Date.now() + 1000 * 60 * 10),
      reason: "Risikofylt oppdrag gikk galt"
    },
    create: {
      userId: player.id,
      cityId: cities[0]?.id,
      jailedUntil: new Date(Date.now() + 1000 * 60 * 10),
      reason: "Risikofylt oppdrag gikk galt"
    }
  })

  await prisma.gamblingGame.createMany({
    data: [
      { name: "Kast Mynt", type: "coin", minBet: 0, maxBet: 10000000, houseEdge: 0.04 },
      { name: "Blackjack", type: "blackjack", minBet: 0, maxBet: 25000000, houseEdge: 0.06 },
      { name: "Hesteløp", type: "race", minBet: 0, maxBet: 15000000, houseEdge: 0.08 },
      { name: "Lotto", type: "lotto", minBet: 0, maxBet: 5000000, houseEdge: 0.1 }
    ],
    skipDuplicates: true
  })

  await prisma.contract.createMany({
    data: [
      {
        creatorId: admin.id,
        title: "Nattlig logistikk",
        description: "Fiktiv produksjonsjobb med lav risiko.",
        cityId: cities[0]?.id,
        durationHours: 24,
        rewardType: "fast",
        rewardTotal: 800000000,
        rewardPerUnit: 0,
        status: "open"
      },
      {
        creatorId: admin.id,
        title: "Diskret innsamling",
        description: "Samle abstraherte datapunkter for en klient.",
        cityId: cities[2]?.id,
        durationHours: 12,
        rewardType: "per_unit",
        rewardTotal: 600000000,
        rewardPerUnit: 6000000,
        status: "open"
      }
    ],
    skipDuplicates: true
  })

  await prisma.passiveAction.createMany({
    data: [
      {
        name: "Skjermet logistikk",
        description: "Passiv rute som gir stabil USD-inntekt.",
        category: "logistikk",
        durationMinutes: 30,
        baseRewardFiat: 18000000,
        baseRewardToken: 20,
        risk: 15
      },
      {
        name: "Lavprofil research",
        description: "Rolig research som øker compliance og gir token.",
        category: "analyse",
        durationMinutes: 40,
        baseRewardFiat: 12000000,
        baseRewardToken: 35,
        risk: 8
      }
    ],
    skipDuplicates: true
  })

  await prisma.notification.createMany({
    data: [
      {
        userId: admin.id,
        type: "system",
        category: "admin",
        title: "Kontrollrom online",
        body: "Live world controls er aktivert.",
        icon: "shield",
        priority: 2
      },
      {
        userId: player.id,
        type: "welcome",
        category: "system",
        title: "Velkommen",
        body: "Reis mellom byer og bygg nettverk.",
        icon: "spark",
        priority: 2
      }
    ],
    skipDuplicates: true
  })

  console.log("Seed complete")
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })




