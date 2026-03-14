import { createContext, useContext, useState, ReactNode } from 'react'

interface NotificationsState {
  instantAlerts: boolean
  emailAlerts: boolean
  dailyDigest: boolean
}

interface NotificationsContextType {
  prefs: NotificationsState
  setPref: (key: keyof NotificationsState, value: boolean) => void
}

const NotificationsContext = createContext<NotificationsContextType>({
  prefs: {
    instantAlerts: true,
    emailAlerts: true,
    dailyDigest: false,
  },
  setPref: () => {},
})

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<NotificationsState>({
    instantAlerts: true,
    emailAlerts: true,
    dailyDigest: false,
  })

  const setPref = (key: keyof NotificationsState, value: boolean) => {
    setPrefs((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <NotificationsContext.Provider value={{ prefs, setPref }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationsContext)
}
