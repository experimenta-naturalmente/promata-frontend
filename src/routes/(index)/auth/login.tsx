import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { LoginForm } from '@/components/forms/loginForm'

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/(index)/auth/login')({
  component: RouteComponent,
  validateSearch: loginSearchSchema,
})

function RouteComponent() {
  return (
  <div className="min-h-screen flex items-center justify-center px-4 py-10 sm:px-8 md:px-12 lg:px-20">
      <LoginForm />
    </div>
  )
}
