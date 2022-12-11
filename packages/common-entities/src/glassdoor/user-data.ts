import { z } from 'zod'

export const UserData = z.object({
  firstname: z.string().min(1),
  lastname: z.string().min(1),
  jobTitle: z.string().min(1),
  currentCompany: z.string().min(1),
  currentLocation: z.string().min(1),
})
export type UserData = z.infer<typeof UserData>
