// src/hooks/useAuth.ts
import { useEffect } from 'react'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useAppStore } from '@/store'
import { getUserProfile, saveUserProfile } from '@/lib/firestore'
import { DEFAULT_FILTER } from '@/store'

export function useAuth() {
  const setUser      = useAppStore((s) => s.setUser)
  const setAuthReady = useAppStore((s) => s.setAuthReady)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const profile = await getUserProfile(fbUser.uid)
        setUser(
          profile ?? {
            uid:       fbUser.uid,
            name:      fbUser.displayName ?? '',
            email:     fbUser.email ?? '',
            interests: DEFAULT_FILTER,
          },
        )
      } else {
        setUser(null)
      }
      setAuthReady()   // mark auth as resolved regardless of sign-in state
    })
    return unsub
  }, [setUser, setAuthReady])

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password)
  }

  async function signUp(email: string, password: string, name: string) {
    const { user: fbUser } = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(fbUser, { displayName: name })
    await saveUserProfile({
      uid: fbUser.uid, name, email, interests: DEFAULT_FILTER,
    })
  }

  async function signOut() {
    await fbSignOut(auth)
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email)
  }

  return { signIn, signUp, signOut, resetPassword }
}
