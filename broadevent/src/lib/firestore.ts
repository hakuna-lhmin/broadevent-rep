// src/lib/firestore.ts
import {
  collection, doc, getDocs, setDoc,
  deleteDoc, getDoc, writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'
import type { BroadEvent, InterestFilter, UserProfile } from '@/types'

// ── 사용자 프로필 ─────────────────────────────────────────────────────────
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? (snap.data() as UserProfile) : null
}

export async function saveUserProfile(
  profile: Partial<UserProfile> & { uid: string },
): Promise<void> {
  await setDoc(
    doc(db, 'users', profile.uid),
    { ...profile, savedAt: new Date().toISOString() },
    { merge: true },
  )
}

// ── 행사 목록 ─────────────────────────────────────────────────────────────
export async function loadEvents(uid: string): Promise<BroadEvent[]> {
  const snap = await getDocs(collection(db, 'users', uid, 'events'))
  return snap.docs.map((d) => d.data() as BroadEvent)
}

export async function saveEvent(uid: string, event: BroadEvent): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'events', event.id), event)
}

export async function deleteEventDoc(uid: string, eventId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'events', eventId))
}

// ── 전체 저장 (관심분야 + 행사 일괄) ─────────────────────────────────────
export async function saveAll(
  uid: string,
  interests: InterestFilter,
  events: BroadEvent[],
): Promise<void> {
  const batch = writeBatch(db)

  // 사용자 관심분야 업데이트
  batch.set(
    doc(db, 'users', uid),
    { uid, interests, savedAt: new Date().toISOString() },
    { merge: true },
  )

  // 행사 전체 upsert
  for (const ev of events) {
    batch.set(doc(db, 'users', uid, 'events', ev.id), ev)
  }

  await batch.commit()
}

// ── 전체 불러오기 ─────────────────────────────────────────────────────────
export async function loadAll(uid: string): Promise<{
  interests: InterestFilter | null
  events: BroadEvent[]
}> {
  const [profileSnap, events] = await Promise.all([
    getDoc(doc(db, 'users', uid)),
    loadEvents(uid),
  ])
  const interests = profileSnap.exists()
    ? (profileSnap.data().interests as InterestFilter) ?? null
    : null
  return { interests, events }
}
