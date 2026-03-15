import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import RoofLogo from '../assets/RoofLogo'
import { supabase } from '../lib/supabase'

const LOGO_SIZE = 160
const LOGO_HEIGHT = Math.round(LOGO_SIZE * (140 / 272))

export default function SplashPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      navigate(session ? '/app/rooms' : '/welcome', { replace: true })
    }

    const timer = setTimeout(check, 2800)
    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="flex flex-col items-center justify-center flex-1 bg-black">
      {/* Writing animation: ghost underneath, clip-reveal on top */}
      <div className="relative" style={{ width: LOGO_SIZE, height: LOGO_HEIGHT }}>
        {/* Ghost — faint outline of the full logo */}
        <motion.div
          className="absolute inset-0 opacity-0"
          animate={{ opacity: 0.12 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <RoofLogo color="white" size={LOGO_SIZE} />
        </motion.div>

        {/* Clip-reveal — logo draws left to right */}
        <motion.div
          className="absolute inset-0 overflow-hidden"
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 1.6, ease: [0.4, 0, 0.15, 1], delay: 0.2 }}
        >
          <RoofLogo color="white" size={LOGO_SIZE} />
        </motion.div>
      </div>
    </div>
  )
}
