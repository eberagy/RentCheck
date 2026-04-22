import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import LoginClient from './LoginClient'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-navy-500" /></div>}>
      <LoginClient />
    </Suspense>
  )
}
