// src/lib/storageHelpers.ts
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from './firebase'
import type { EventFile } from '@/types'

export type UploadCategory = 'paper' | 'meeting' | 'report' | 'photo' | 'booth'

export async function uploadFile(
  uid: string,
  eventId: string,
  category: UploadCategory,
  file: File,
): Promise<EventFile> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._\-가-힣]/g, '_')
  const path = `users/${uid}/events/${eventId}/${category}/${Date.now()}_${safeName}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  const url = await getDownloadURL(storageRef)
  return { name: file.name, url, uploadedAt: new Date().toISOString() }
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
