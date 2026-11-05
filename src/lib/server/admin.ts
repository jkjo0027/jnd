import 'server-only';
import { redirect } from 'next/navigation';
import { currentUser, type User } from './auth';
export async function requireUser(): Promise<{ user: User }> {
  const user = await currentUser();
  if (!user) redirect('/admin/login/');
  return { user };
}
