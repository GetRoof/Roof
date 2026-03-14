import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Bell, Mail, Zap, TrendingDown } from 'lucide-react'
import Toggle from '../../components/ui/Toggle'
import BottomNav from '../../components/layout/BottomNav'
import { useNotifications } from '../../context/NotificationsContext'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { prefs, setPref } = useNotifications()

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-14 pb-4 border-b border-border flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="active:opacity-60">
          <ChevronLeft size={22} strokeWidth={2} />
        </button>
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {/* Notifications section */}
        <div className="px-5 py-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={16} strokeWidth={1.8} />
            <h2 className="text-[15px] font-semibold text-foreground">Notifications</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-secondary rounded-xl flex items-center justify-center flex-shrink-0">
                <Zap size={16} strokeWidth={1.8} />
              </div>
              <div className="flex-1">
                <Toggle label="Instant alerts" checked={prefs.instantAlerts} onChange={(v) => setPref('instantAlerts', v)} />
                <p className="text-xs text-muted mt-0.5">Get notified the moment a listing appears</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-secondary rounded-xl flex items-center justify-center flex-shrink-0">
                <Mail size={16} strokeWidth={1.8} />
              </div>
              <div className="flex-1">
                <Toggle label="Email alerts" checked={prefs.emailAlerts} onChange={(v) => setPref('emailAlerts', v)} />
                <p className="text-xs text-muted mt-0.5">Matching listings sent to your inbox</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-secondary rounded-xl flex items-center justify-center flex-shrink-0">
                <TrendingDown size={16} strokeWidth={1.8} />
              </div>
              <div className="flex-1">
                <Toggle label="Price drops" checked={prefs.priceDrops} onChange={(v) => setPref('priceDrops', v)} />
                <p className="text-xs text-muted mt-0.5">When a saved listing reduces its price</p>
              </div>
            </div>
            <Toggle label="Daily digest" checked={prefs.dailyDigest} onChange={(v) => setPref('dailyDigest', v)} />
          </div>
        </div>

        <div className="h-px bg-border mx-5" />

        {/* About */}
        <div className="px-5 py-5 space-y-4">
          <h2 className="text-[15px] font-semibold text-foreground">About</h2>
          {['Privacy Policy', 'Terms of Service', 'Contact Support', 'Rate Roof ⭐'].map(item => (
            <button key={item} className="flex justify-between items-center w-full text-[15px] text-foreground py-1 active:opacity-60">
              {item}
              <ChevronLeft size={16} className="text-muted rotate-180" />
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-muted pb-8">Roof v0.1.0 · Made in Amsterdam 🇳🇱</p>
      </div>

      <BottomNav />
    </div>
  )
}
