// src/lib/storageHelpers.ts
// ─────────────────────────────────────────────────────────────────────────────
// Firebase Storage 헬퍼
// VITE_ENABLE_STORAGE=false 로 설정 시 → 파일 업로드 기능 비활성화
// Firebase Spark(무료) 요금제에서 Storage를 사용하지 않을 때 설정합니다.
// ─────────────────────────────────────────────────────────────────────────────
import type { EventFile } from '@/types'

// Storage 활성화 여부 (기본값: true)
// .env 파일에 VITE_ENABLE_STORAGE=false 를 추가하면 비활성화됩니다.
export const STORAGE_ENABLED =
  import.meta.env.VITE_ENABLE_STORAGE !== 'false'

export type UploadCategory = 'paper' | 'meeting' | 'report' | 'photo' | 'booth'

export async function uploadFile(
  uid: string,
  eventId: string,
  category: UploadCategory,
  file: File,
): Promise<EventFile> {
  if (!STORAGE_ENABLED) {
    // Storage 비활성화 시 — 파일을 브라우저 메모리(ObjectURL)에만 임시 보관
    // 새로고침하면 사라지지만, 해당 세션에서는 파일명과 미리보기가 가능
    const url = URL.createObjectURL(file)
    return {
      name: file.name,
      url,
      uploadedAt: new Date().toISOString(),
    }
  }

  // Firebase Storage 사용 (VITE_ENABLE_STORAGE=true 또는 미설정)
  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage')
  const { storage } = await import('@/lib/firebase')
  const safeName = file.name.replace(/[^a-zA-Z0-9._\-가-힣]/g, '_')
  const path = `users/${uid}/events/${eventId}/${category}/${Date.now()}_${safeName}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  const downloadUrl = await getDownloadURL(storageRef)
  return {
    name: file.name,
    url: downloadUrl,
    uploadedAt: new Date().toISOString(),
  }
}

export function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      resolve({ base64, mimeType: file.type })
    }
    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'))
    reader.readAsDataURL(file)
  })
}
