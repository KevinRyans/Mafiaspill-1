import { Router } from "express"
import authRoutes from "./auth"
import profileRoutes from "./profile"
import missionRoutes from "./missions"
import marketRoutes from "./market"
import crewRoutes from "./crew"
import combatRoutes from "./combat"
import worldRoutes from "./world"
import adminRoutes from "./admin"
import notificationRoutes from "./notifications"
import contactRoutes from "./contacts"
import passiveRoutes from "./passive"
import achievementRoutes from "./achievements"
import travelRoutes from "./travel"
import gamblingRoutes from "./gambling"
import darknetRoutes from "./darknet"
import prisonRoutes from "./prison"
import respectRoutes from "./respect"
import businessRoutes from "./business"
import benefitsRoutes from "./benefits"
import bankRoutes from "./bank"
import crimeRoutes from "./crime"
import carTheftRoutes from "./carTheft"
import houseRobberyRoutes from "./houseRobbery"
import playerRobberyRoutes from "./playerRobbery"
import fightClubRoutes from "./fightClub"
import garageRoutes from "./garage"
import { adminRoutePath } from "../middleware/auth"

const router = Router()

router.use("/auth", authRoutes)
router.use("/profile", profileRoutes)
router.use("/missions", missionRoutes)
router.use("/market", marketRoutes)
router.use("/crew", crewRoutes)
router.use("/combat", combatRoutes)
router.use("/world", worldRoutes)
router.use("/notifications", notificationRoutes)
router.use("/contacts", contactRoutes)
router.use("/passive", passiveRoutes)
router.use("/achievements", achievementRoutes)
router.use("/travel", travelRoutes)
router.use("/gambling", gamblingRoutes)
router.use("/darknet", darknetRoutes)
router.use("/prison", prisonRoutes)
router.use("/respect", respectRoutes)
router.use("/benefits", benefitsRoutes)
router.use("/business", businessRoutes)
router.use("/bank", bankRoutes)
router.use("/crime", crimeRoutes)
router.use("/car-theft", carTheftRoutes)
router.use("/house-robbery", houseRobberyRoutes)
router.use("/player-robbery", playerRobberyRoutes)
router.use("/fight-club", fightClubRoutes)
router.use("/garage", garageRoutes)
router.use(adminRoutePath(), adminRoutes)

export default router
